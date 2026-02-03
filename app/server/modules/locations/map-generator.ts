import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { FileMetadata } from '@shared/types/file';
import type { CelestialData, MapConfig } from '@shared/schemas/location';
import { DEFAULT_MAP_CONFIG } from '@shared/schemas/location';

// Get the directory of this file for locating the Python generator
const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface MapGeneratorOptions {
  campaignPath: string;
  locations: FileMetadata[];
  outputPath: string;
  config?: MapConfig;
}

/**
 * Generates a CSV file from location data for the Python map generator
 */
async function generateCsv(
  locations: FileMetadata[],
  campaignPath: string,
  config: MapConfig
): Promise<string> {
  const headers = [
    'name',
    'type',
    'parent',
    'orbit_distance',
    'radius',
    'color',
    'image_path',
    'description',
    'region',
    'faction',
    'population',
    'start_position',
    'show_label',
    'orbit_color',
    'orbit_style',
    'background_color',
    'background_image',
    'font_family',
    'ring_width',
    'background_type',
    'nebula_colors',
    'orbit_shape',
    'orbit_eccentricity',
    'orbit_rotation',
    'location_id',
  ];

  const rows: string[][] = [];

  // Add config row for background styling (from map config)
  // Column positions: 1=name, 2=type, 3=parent, 4=orbit_distance, 5=radius, 6=color,
  // 7=image_path, 8=description, 9=region, 10=faction, 11=population, 12=start_position,
  // 13=show_label, 14=orbit_color, 15=orbit_style, 16=background_color, 17=background_image,
  // 18=font_family, 19=ring_width, 20=background_type, 21=nebula_colors,
  // 22=orbit_shape, 23=orbit_eccentricity, 24=orbit_rotation
  const nebulaColorsStr = (config.nebulaColors || DEFAULT_MAP_CONFIG.nebulaColors || []).join(',');
  rows.push([
    'System Config',        // 1: name
    'config',               // 2: type
    '',                     // 3: parent
    '',                     // 4: orbit_distance
    '',                     // 5: radius
    '',                     // 6: color
    '',                     // 7: image_path
    '',                     // 8: description
    '',                     // 9: region
    '',                     // 10: faction
    '',                     // 11: population
    '',                     // 12: start_position
    '',                     // 13: show_label
    config.defaultOrbitColor || DEFAULT_MAP_CONFIG.defaultOrbitColor,  // 14: orbit_color
    config.defaultOrbitStyle || DEFAULT_MAP_CONFIG.defaultOrbitStyle,  // 15: orbit_style
    config.backgroundColor || DEFAULT_MAP_CONFIG.backgroundColor,      // 16: background_color
    '',                     // 17: background_image
    config.fontFamily || '', // 18: font_family
    '',                     // 19: ring_width
    config.backgroundType || DEFAULT_MAP_CONFIG.backgroundType,        // 20: background_type
    nebulaColorsStr,        // 21: nebula_colors
    '',                     // 22: orbit_shape
    '',                     // 23: orbit_eccentricity
    '',                     // 24: orbit_rotation
    '',                     // 25: location_id
  ]);

  // Add celestial body rows
  for (const loc of locations) {
    const celestial = loc.celestial as CelestialData | undefined;
    if (!celestial) continue;

    // Resolve image path if provided
    let imagePath = '';
    const mapImage = celestial.mapImage;
    if (mapImage) {
      // If it's an assets path, resolve to full path
      if (mapImage.startsWith('assets/')) {
        imagePath = path.join(campaignPath, mapImage);
      } else {
        imagePath = mapImage;
      }
    }

    // Find parent name (convert ID to name)
    let parentName = '';
    const parentId = loc.parent as string | undefined;
    if (parentId) {
      const parentLoc = locations.find((l) => l.id === parentId);
      if (parentLoc) {
        parentName = parentLoc.name;
      }
    }

    const row = [
      loc.name,
      celestial.bodyType,
      parentName,
      celestial.orbitDistance?.toString() || '',
      celestial.radius?.toString() || '',
      celestial.color || '',
      imagePath,
      (loc.description as string) || '',
      '', // region
      '', // faction
      '', // population
      celestial.startPosition?.toString() || '',
      celestial.showLabel !== false ? 'TRUE' : 'FALSE',
      celestial.orbitColor || '',
      celestial.orbitStyle || '',
      '', // background_color
      '', // background_image
      '', // font_family
      celestial.ringWidth?.toString() || '',
      '', // background_type
      '', // nebula_colors
      celestial.orbitShape || 'circle',
      celestial.orbitEccentricity?.toString() || '',
      celestial.orbitRotation?.toString() || '',
      loc.id, // 25: location_id for navigation
    ];

    rows.push(row);
  }

  // Convert to CSV string
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => {
        // Escape cells that contain commas or quotes
        if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(',')
    ),
  ].join('\n');

  return csvContent;
}

/**
 * Generates a star system map HTML file using the Python generator
 */
export async function generateStarSystemMap(
  options: MapGeneratorOptions
): Promise<{ success: boolean; error?: string }> {
  const { campaignPath, locations, outputPath, config } = options;

  // Use provided config or defaults
  const mapConfig = config || DEFAULT_MAP_CONFIG;

  // Filter to only celestial locations
  const celestialLocations = locations.filter(
    (loc) => loc.celestial !== undefined && loc.celestial !== null
  );

  if (celestialLocations.length === 0) {
    return { success: false, error: 'No celestial bodies to display on map' };
  }

  // Generate CSV content
  const csvContent = await generateCsv(locations, campaignPath, mapConfig);

  // Write CSV to temp file
  const tempCsvPath = path.join(campaignPath, '.temp-map-data.csv');
  await fs.writeFile(tempCsvPath, csvContent, 'utf-8');

  // Path to Python generator (located in the same directory as this file)
  const generatorPath = path.resolve(
    __dirname,
    'star_system_generator_v7.py'
  );

  // Check if generator exists
  try {
    await fs.access(generatorPath);
  } catch {
    // Clean up temp file
    try {
      await fs.unlink(tempCsvPath);
    } catch {}
    return { success: false, error: 'Map generator not found' };
  }

  return new Promise((resolve) => {
    // We need to call Python in a way that doesn't use the GUI
    // Pass all paths as command-line arguments to avoid code injection
    const mapWidth = mapConfig.mapWidth || DEFAULT_MAP_CONFIG.mapWidth;
    const mapHeight = mapConfig.mapHeight || DEFAULT_MAP_CONFIG.mapHeight;

    // Use a safe Python wrapper script that takes arguments instead of string interpolation
    // This prevents path injection vulnerabilities
    const pythonCode = `
import sys
import os
import json

# Get arguments from command line (safer than string interpolation)
if len(sys.argv) < 6:
    print("Usage: script.py <generator_dir> <csv_path> <output_path> <campaign_path> <width> <height>", file=sys.stderr)
    sys.exit(1)

generator_dir = sys.argv[1]
csv_path = sys.argv[2]
output_path = sys.argv[3]
campaign_path = sys.argv[4]
width = int(sys.argv[5])
height = int(sys.argv[6])

# Validate paths exist and are safe
if not os.path.isfile(csv_path):
    print(f"CSV file not found: {csv_path}", file=sys.stderr)
    sys.exit(1)

sys.path.insert(0, generator_dir)
from star_system_generator_v7 import CSVStarSystemGenerator

# Change to campaign directory for relative image paths
os.chdir(campaign_path)

generator = CSVStarSystemGenerator(width=width, height=height)
generator.load_csv(csv_path)
generator.calculate_positions()
html_content = generator.generate_interactive_html()

with open(output_path, 'w') as f:
    f.write(html_content)

print('SUCCESS')
`;

    // Pass paths as arguments instead of embedding them in the code
    const python = spawn('python3', [
      '-c', pythonCode,
      path.dirname(generatorPath),  // arg 1: generator directory
      tempCsvPath,                   // arg 2: CSV path
      outputPath,                    // arg 3: output path
      campaignPath,                  // arg 4: campaign path
      String(mapWidth),              // arg 5: width
      String(mapHeight),             // arg 6: height
    ], {
      cwd: campaignPath,
    });

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', async (code) => {
      // Clean up temp file
      try {
        await fs.unlink(tempCsvPath);
      } catch {}

      if (code === 0 && stdout.includes('SUCCESS')) {
        resolve({ success: true });
      } else {
        console.error('Map generation failed:', stderr || stdout);
        resolve({
          success: false,
          error: stderr || 'Map generation failed',
        });
      }
    });

    python.on('error', async (err) => {
      // Clean up temp file
      try {
        await fs.unlink(tempCsvPath);
      } catch {}

      resolve({
        success: false,
        error: `Failed to run Python: ${err.message}`,
      });
    });
  });
}
