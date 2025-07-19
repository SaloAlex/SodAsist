import { ClienteConRuta, LatLng, RouteStats } from '../types';

interface OptimizeRouteOptions {
  ubicacionInicial?: LatLng;
}

export class RouteOptimizer {
  private static readonly MAX_WAYPOINTS = 25;
  private static readonly BATCH_SIZE = 10;
  private static readonly BATCH_DELAY = 1000;
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 2000;
  private static geocodeCache = new Map<string, LatLng>();

  private static async reintentarOperacion<T>(
    operacion: () => Promise<T>,
    intentos = 0
  ): Promise<T> {
    try {
      return await operacion();
    } catch (error) {
      if (intentos < this.MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
        return this.reintentarOperacion(operacion, intentos + 1);
      }
      throw error;
    }
  }

  private static validarDirecciones(clientes: ClienteConRuta[]) {
    const clientesSinDireccion = clientes.filter(cliente => !cliente.direccion);
    if (clientesSinDireccion.length > 0) {
      throw new Error(`Los siguientes clientes no tienen dirección: ${
        clientesSinDireccion.map(c => c.nombre).join(', ')
      }`);
    }
  }

  private static normalizarDireccion(direccion: string) {
    const normalizada = direccion.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      original: direccion,
      normalizada
    };
  }

  static async optimizeRoute(
    clientes: ClienteConRuta[],
    options: OptimizeRouteOptions = {}
  ): Promise<{
    clientesOrdenados: ClienteConRuta[];
    stats: RouteStats;
  }> {
    try {
      if (!clientes || clientes.length === 0) {
        throw new Error('No hay clientes para optimizar la ruta');
      }

      if (clientes.length === 1) {
        return {
          clientesOrdenados: clientes,
          stats: {
            distanciaTotal: 0,
            tiempoTotal: 0,
            distanciasIndividuales: [0],
            tiemposIndividuales: [0]
          }
        };
      }

      // Validar direcciones
      this.validarDirecciones(clientes);

      console.log('Obteniendo coordenadas para', clientes.length, 'clientes');
      
      // Obtener coordenadas en paralelo con rate limiting
      const clientesConCoordenadas = await this.obtenerCoordenadasParalelo(clientes);

      // Si hay más de MAX_WAYPOINTS waypoints, dividir en subrutas
      if (clientesConCoordenadas.length > this.MAX_WAYPOINTS + 2) {
        return await this.optimizarRutaGrande(clientesConCoordenadas, options);
      }

      return await this.optimizarRutaSimple(clientesConCoordenadas, options);
    } catch (error) {
      console.error('Error al optimizar ruta:', error);
      throw error instanceof Error ? error : new Error('Error desconocido al optimizar la ruta');
    }
  }

  private static async obtenerCoordenadasParalelo(clientes: ClienteConRuta[]): Promise<ClienteConRuta[]> {
    const batches = [];
    
    for (let i = 0; i < clientes.length; i += this.BATCH_SIZE) {
      const batch = clientes.slice(i, i + this.BATCH_SIZE);
      batches.push(batch);
    }

    const clientesConCoordenadas: ClienteConRuta[] = [];
    
    for (const batch of batches) {
      const resultados = await Promise.allSettled(
        batch.map(cliente => this.getCoordinates(cliente.direccion))
      );

      const clientesValidos = resultados.map((resultado, index) => {
        if (resultado.status === 'fulfilled') {
          return { ...batch[index], coords: resultado.value };
        } else {
          console.error(`Error al geocodificar ${batch[index].nombre}:`, resultado.reason);
          return null;
        }
      }).filter((cliente): cliente is ClienteConRuta & { coords: LatLng } => 
        cliente !== null && cliente.coords !== undefined
      );

      clientesConCoordenadas.push(...clientesValidos);

      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, this.BATCH_DELAY));
      }
    }

    if (clientesConCoordenadas.length === 0) {
      throw new Error('No se pudo geocodificar ninguna dirección');
    }

    return clientesConCoordenadas;
  }

  private static async optimizarRutaSimple(
    clientes: ClienteConRuta[],
    options: OptimizeRouteOptions
  ): Promise<{
    clientesOrdenados: ClienteConRuta[];
    stats: RouteStats;
  }> {
    try {
      const directionsService = new window.google.maps.DirectionsService();

      // Validar que todos los clientes tengan coordenadas
      const clientesConCoordenadas = clientes.filter(cliente => cliente.coords);
      if (clientesConCoordenadas.length !== clientes.length) {
        throw new Error('Algunos clientes no tienen coordenadas válidas');
      }

      // Calcular matriz de distancias si hay más de 2 clientes
      if (clientesConCoordenadas.length > 2) {
        const matrizDistancias = await this.calcularMatrizDistancias(clientesConCoordenadas);
        const rutaOptima = this.encontrarRutaOptima(matrizDistancias, options.ubicacionInicial ? 0 : -1);
        clientesConCoordenadas.splice(0, clientesConCoordenadas.length, 
          ...rutaOptima.map(idx => clientesConCoordenadas[idx]));
      }

      // Usar ubicación inicial si está disponible, sino usar el primer cliente
      const origin = options.ubicacionInicial || clientesConCoordenadas[0].coords!;
      const destination = clientesConCoordenadas[clientesConCoordenadas.length - 1].coords!;
      const waypoints = clientesConCoordenadas.slice(1, -1).map(cliente => ({
        location: new window.google.maps.LatLng(cliente.coords!.lat, cliente.coords!.lng),
        stopover: true
      }));

      // Calcular hora de salida considerando el tráfico actual
      const departureTime = new Date();
      departureTime.setMinutes(departureTime.getMinutes() + 5); // 5 minutos en el futuro

      const result = await this.reintentarOperacion(() => {
        return new Promise<google.maps.DirectionsResult>((resolve, reject) => {
          directionsService.route({
            origin: new google.maps.LatLng(origin.lat, origin.lng),
            destination: new google.maps.LatLng(destination.lat, destination.lng),
            waypoints,
            optimizeWaypoints: true,
            travelMode: google.maps.TravelMode.DRIVING,
            drivingOptions: {
              departureTime,
              trafficModel: google.maps.TrafficModel.BEST_GUESS
            },
            // Evitar peajes y ferries si es posible
            avoidFerries: true,
            avoidTolls: true
          }, (response, status) => {
            if (status === 'OK' && response) {
              resolve(response);
            } else {
              reject(new Error(`Error al obtener la ruta optimizada: ${status}`));
            }
          });
        });
      });

      // Calcular estadísticas detalladas
      const stats = this.calcularEstadisticasDetalladas(result);

      return {
        clientesOrdenados: clientesConCoordenadas,
        stats
      };
    } catch (error) {
      console.error('Error al optimizar ruta simple:', error);
      throw error instanceof Error ? error : new Error('Error desconocido al optimizar la ruta simple');
    }
  }

  private static async optimizarRutaGrande(
    clientes: ClienteConRuta[],
    options: OptimizeRouteOptions
  ): Promise<{
    clientesOrdenados: ClienteConRuta[];
    stats: RouteStats;
  }> {
    // Agrupar clientes por proximidad usando K-means
    const agruparClientesPorProximidad = (clientes: ClienteConRuta[], k: number) => {
      const centroides: LatLng[] = [];
      const grupos: ClienteConRuta[][] = Array(k).fill([]).map(() => []);
      
      // Seleccionar centroides iniciales usando K-means++
      centroides.push(clientes[0].coords!);
      for (let i = 1; i < k; i++) {
        let maxDistancia = -1;
        let siguienteCentroide: LatLng | null = null;
        
        for (const cliente of clientes) {
          const minDistancia = Math.min(...centroides.map(c => 
            Math.pow(c.lat - cliente.coords!.lat, 2) + Math.pow(c.lng - cliente.coords!.lng, 2)
          ));
          
          if (minDistancia > maxDistancia) {
            maxDistancia = minDistancia;
            siguienteCentroide = cliente.coords!;
          }
        }
        
        if (siguienteCentroide) {
          centroides.push(siguienteCentroide);
        }
      }

      // Iterar hasta convergencia
      let cambios = true;
      const maxIteraciones = 100;
      let iteracion = 0;

      while (cambios && iteracion < maxIteraciones) {
        cambios = false;
        iteracion++;

        // Limpiar grupos
        grupos.forEach(grupo => grupo.length = 0);

        // Asignar clientes al centroide más cercano
        for (const cliente of clientes) {
          let minDistancia = Infinity;
          let grupoMasCercano = 0;

          centroides.forEach((centroide, index) => {
            const distancia = Math.pow(centroide.lat - cliente.coords!.lat, 2) + 
                            Math.pow(centroide.lng - cliente.coords!.lng, 2);
            if (distancia < minDistancia) {
              minDistancia = distancia;
              grupoMasCercano = index;
            }
          });

          grupos[grupoMasCercano].push(cliente);
        }

        // Actualizar centroides
        for (let i = 0; i < k; i++) {
          if (grupos[i].length > 0) {
            const nuevoLat = grupos[i].reduce((sum, c) => sum + c.coords!.lat, 0) / grupos[i].length;
            const nuevoLng = grupos[i].reduce((sum, c) => sum + c.coords!.lng, 0) / grupos[i].length;

            if (Math.abs(nuevoLat - centroides[i].lat) > 0.0001 || 
                Math.abs(nuevoLng - centroides[i].lng) > 0.0001) {
              centroides[i] = { lat: nuevoLat, lng: nuevoLng };
              cambios = true;
            }
          }
        }
      }

      return grupos.filter(grupo => grupo.length > 0);
    };

    // Calcular número óptimo de grupos basado en el número de clientes
    const numGrupos = Math.ceil(clientes.length / this.MAX_WAYPOINTS);
    const grupos = agruparClientesPorProximidad(clientes, numGrupos);

    // Optimizar cada grupo y conectarlos
    const clientesOrdenados: ClienteConRuta[] = [];
    const statsAcumulados: RouteStats = {
      distanciaTotal: 0,
      tiempoTotal: 0,
      distanciasIndividuales: [],
      tiemposIndividuales: []
    };

    // Si hay ubicación inicial, empezar por el grupo más cercano
    if (options.ubicacionInicial) {
      grupos.sort((a, b) => {
        const distanciaA = Math.pow(a[0].coords!.lat - options.ubicacionInicial!.lat, 2) + 
                          Math.pow(a[0].coords!.lng - options.ubicacionInicial!.lng, 2);
        const distanciaB = Math.pow(b[0].coords!.lat - options.ubicacionInicial!.lat, 2) + 
                          Math.pow(b[0].coords!.lng - options.ubicacionInicial!.lng, 2);
        return distanciaA - distanciaB;
      });
    }

    // Optimizar cada grupo
    for (let i = 0; i < grupos.length; i++) {
      const grupo = grupos[i];
      const grupoOptions = {
        ...options,
        // Usar ubicación inicial solo para el primer grupo
        ubicacionInicial: i === 0 ? options.ubicacionInicial : undefined
      };

      const resultado = await this.optimizarRutaSimple(grupo, grupoOptions);
      
      // Si no es el primer grupo, usar el último cliente del grupo anterior como punto de inicio
      if (i > 0 && clientesOrdenados.length > 0) {
        const ultimoCliente = clientesOrdenados[clientesOrdenados.length - 1];
        const conexion = await this.optimizarRutaSimple(
          [ultimoCliente, resultado.clientesOrdenados[0]], 
          { ubicacionInicial: ultimoCliente.coords }
        );
        
        statsAcumulados.distanciaTotal += conexion.stats.distanciaTotal;
        statsAcumulados.tiempoTotal += conexion.stats.tiempoTotal;
        statsAcumulados.distanciasIndividuales.push(...conexion.stats.distanciasIndividuales);
        statsAcumulados.tiemposIndividuales.push(...conexion.stats.tiemposIndividuales);
      }

      clientesOrdenados.push(...resultado.clientesOrdenados);
      statsAcumulados.distanciaTotal += resultado.stats.distanciaTotal;
      statsAcumulados.tiempoTotal += resultado.stats.tiempoTotal;
      statsAcumulados.distanciasIndividuales.push(...resultado.stats.distanciasIndividuales);
      statsAcumulados.tiemposIndividuales.push(...resultado.stats.tiemposIndividuales);
    }

    return {
      clientesOrdenados,
      stats: statsAcumulados
    };
  }

  private static async calcularMatrizDistancias(clientes: ClienteConRuta[]): Promise<number[][]> {
    const service = new window.google.maps.DistanceMatrixService();
    const matriz: number[][] = Array(clientes.length).fill(0).map(() => Array(clientes.length).fill(0));

    for (let i = 0; i < clientes.length; i += 10) {
      const origenesLote = clientes.slice(i, i + 10);
      
      for (let j = 0; j < clientes.length; j += 10) {
        const destinosLote = clientes.slice(j, j + 10);

        const result = await this.reintentarOperacion(() => {
          return new Promise<google.maps.DistanceMatrixResponse>((resolve, reject) => {
            service.getDistanceMatrix({
              origins: origenesLote.map(c => new google.maps.LatLng(c.coords!.lat, c.coords!.lng)),
              destinations: destinosLote.map(c => new google.maps.LatLng(c.coords!.lat, c.coords!.lng)),
              travelMode: google.maps.TravelMode.DRIVING,
              drivingOptions: {
                departureTime: new Date(Date.now() + 2 * 60 * 1000),
                trafficModel: google.maps.TrafficModel.BEST_GUESS
              }
            }, (response, status) => {
              if (status === 'OK' && response) {
                resolve(response);
              } else {
                reject(new Error(`Error al obtener matriz de distancias: ${status}`));
              }
            });
          });
        });

        result.rows.forEach((row, rowIdx) => {
          row.elements.forEach((element, colIdx) => {
            if (element.status === 'OK') {
              matriz[i + rowIdx][j + colIdx] = element.duration.value;
            } else {
              // Si hay error, usar distancia euclidiana como fallback
              const origen = clientes[i + rowIdx].coords!;
              const destino = clientes[j + colIdx].coords!;
              const distancia = Math.sqrt(
                Math.pow(origen.lat - destino.lat, 2) + 
                Math.pow(origen.lng - destino.lng, 2)
              ) * 111000; // Convertir a metros (aprox)
              matriz[i + rowIdx][j + colIdx] = distancia / 50; // Asumir velocidad promedio de 50 m/s
            }
          });
        });

        // Esperar un poco entre lotes para evitar rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return matriz;
  }

  private static encontrarRutaOptima(matriz: number[][], puntoInicial: number): number[] {
    const n = matriz.length;
    const visitados = new Set<number>();
    const ruta: number[] = [];
    let actual = puntoInicial >= 0 ? puntoInicial : 0;

    visitados.add(actual);
    ruta.push(actual);

    while (visitados.size < n) {
      let siguiente = -1;
      let minTiempo = Infinity;

      for (let i = 0; i < n; i++) {
        if (!visitados.has(i)) {
          const tiempo = matriz[actual][i];
          if (tiempo < minTiempo) {
            minTiempo = tiempo;
            siguiente = i;
          }
        }
      }

      if (siguiente === -1) break;
      visitados.add(siguiente);
      ruta.push(siguiente);
      actual = siguiente;
    }

    return ruta;
  }

  private static calcularEstadisticasDetalladas(result: google.maps.DirectionsResult): RouteStats {
    const route = result.routes[0];
    const stats: RouteStats = {
      distanciaTotal: 0,
      tiempoTotal: 0,
      distanciasIndividuales: [],
      tiemposIndividuales: []
    };

    route.legs.forEach(leg => {
      const distancia = leg.distance?.value || 0;
      const tiempo = leg.duration?.value || 0;
      const tiempoConTrafico = leg.duration_in_traffic?.value || tiempo;

      stats.distanciaTotal += distancia;
      stats.tiempoTotal += tiempoConTrafico;
      stats.distanciasIndividuales.push(distancia);
      stats.tiemposIndividuales.push(tiempoConTrafico);
    });

    return stats;
  }

  private static async getCoordinates(direccion: string): Promise<LatLng> {
    try {
      const { normalizada } = this.normalizarDireccion(direccion);
      
      // Verificar cache con dirección normalizada
      if (this.geocodeCache.has(normalizada)) {
        return this.geocodeCache.get(normalizada)!;
      }

      const geocoder = new window.google.maps.Geocoder();
      
      const geocodificar = async (): Promise<google.maps.GeocoderResult[]> => {
        return new Promise((resolve, reject) => {
          geocoder.geocode(
            { address: direccion },
            (results, status) => {
              if (status === 'OK' && results) {
                resolve(results);
              } else {
                reject(new Error(`Error al geocodificar: ${status}`));
              }
            }
          );
        });
      };

      const results = await this.reintentarOperacion(geocodificar);

      if (results[0].partial_match) {
        console.warn(`⚠️ Coincidencia parcial para la dirección: ${direccion}`);
      }

      const location = results[0].geometry.location;
      const coords = { 
        lat: location.lat(), 
        lng: location.lng() 
      };
      
      this.geocodeCache.set(normalizada, coords);
      return coords;
    } catch (error) {
      console.error('Error al obtener coordenadas:', error);
      throw error instanceof Error ? error : new Error(`Error al geocodificar: ${direccion}`);
    }
  }
}