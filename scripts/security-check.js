#!/usr/bin/env node

/**
 * Script de verificación de seguridad
 * Busca claves API y secretos hardcodeados en el proyecto
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🔍 Iniciando verificación de seguridad...\n');

// Patrones de claves API y secretos
const secretPatterns = [
  {
    name: 'Google API Key',
    pattern: /AIza[A-Za-z0-9_-]{35}/g,
    severity: 'CRITICAL'
  },
  {
    name: 'Firebase API Key',
    pattern: /AIza[A-Za-z0-9_-]{35}/g,
    severity: 'CRITICAL'
  },
  {
    name: 'OpenAI API Key',
    pattern: /sk-[A-Za-z0-9]{48}/g,
    severity: 'CRITICAL'
  },
  {
    name: 'Generic API Key',
    pattern: /api[_-]?key\s*[:=]\s*["\']?[A-Za-z0-9_-]{20,}["\']?/gi,
    severity: 'HIGH'
  },
  {
    name: 'Secret Key',
    pattern: /secret[_-]?key\s*[:=]\s*["\']?[A-Za-z0-9_-]{20,}["\']?/gi,
    severity: 'HIGH'
  },
  {
    name: 'Private Key',
    pattern: /private[_-]?key\s*[:=]\s*["\']?-----BEGIN [A-Z ]+-----/gi,
    severity: 'CRITICAL'
  }
];

// Archivos y directorios a excluir
const excludePatterns = [
  'node_modules',
  '.git',
  'dist',
  '.env',
  '.env.example',
  'package-lock.json',
  'yarn.lock',
  '*.log'
];

// Función para buscar archivos
function findFiles(dir, extensions = ['.js', '.ts', '.tsx', '.jsx', '.html', '.json']) {
  let files = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Saltar directorios excluidos
        if (!excludePatterns.some(pattern => item.includes(pattern))) {
          files = files.concat(findFiles(fullPath, extensions));
        }
      } else if (stat.isFile()) {
        const ext = path.extname(item);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    // Ignorar errores de permisos
  }
  
  return files;
}

// Función para buscar secretos en un archivo
function searchSecretsInFile(filePath) {
  const issues = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    secretPatterns.forEach(({ name, pattern, severity }) => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          issues.push({
            file: filePath,
            type: name,
            severity,
            match: match.substring(0, 20) + '...', // Solo mostrar primeros 20 caracteres
            line: content.substring(0, content.indexOf(match)).split('\n').length
          });
        });
      }
    });
  } catch (error) {
    // Ignorar errores de lectura
  }
  
  return issues;
}

// Ejecutar verificación
const allIssues = [];
const files = findFiles('.');

console.log(`📁 Analizando ${files.length} archivos...\n`);

files.forEach(file => {
  const issues = searchSecretsInFile(file);
  allIssues.push(...issues);
});

// Mostrar resultados
if (allIssues.length === 0) {
  console.log('✅ ¡Excelente! No se encontraron secretos expuestos.');
} else {
  console.log(`🚨 Se encontraron ${allIssues.length} problemas de seguridad:\n`);
  
  // Agrupar por severidad
  const critical = allIssues.filter(i => i.severity === 'CRITICAL');
  const high = allIssues.filter(i => i.severity === 'HIGH');
  
  if (critical.length > 0) {
    console.log('🔴 CRÍTICO:');
    critical.forEach(issue => {
      console.log(`   ${issue.file}:${issue.line} - ${issue.type}`);
      console.log(`   Match: ${issue.match}`);
    });
    console.log('');
  }
  
  if (high.length > 0) {
    console.log('🟡 ALTO:');
    high.forEach(issue => {
      console.log(`   ${issue.file}:${issue.line} - ${issue.type}`);
      console.log(`   Match: ${issue.match}`);
    });
    console.log('');
  }
  
  console.log('💡 Recomendaciones:');
  console.log('   1. Mover todas las claves a variables de entorno');
  console.log('   2. Usar archivo .env (agregado a .gitignore)');
  console.log('   3. Rotar las claves expuestas inmediatamente');
  console.log('   4. Revisar el historial de Git para claves comprometidas');
  
  process.exit(1);
}

console.log('🎉 Verificación de seguridad completada exitosamente');
