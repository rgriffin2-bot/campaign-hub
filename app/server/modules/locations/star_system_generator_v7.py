#!/usr/bin/env python3
"""
CSV Star System Generator - GUI App Version
Creates star systems from CSV configuration files with a file picker interface

v7: Native macOS dialogs
- Uses osascript for native macOS file picker (no Python app in dock)
- Native dialogs always appear front and center
- Cleaner UX with no tkinter dependency
- Single app experience
"""

import csv
import math
import os
import base64
import subprocess
from typing import List, Dict, Optional


class CelestialBodyConfig:
    """Configuration for a celestial body from CSV"""
    def __init__(self, row: Dict[str, str]):
        self.name = row.get('name', 'Unnamed')
        self.type = row.get('type', 'planet').lower()  # star, planet, moon, station, asteroid_ring
        self.parent = row.get('parent', '').strip()  # Name of parent body (empty for primary star)

        # Handle empty strings for numeric fields
        orbit_dist_val = row.get('orbit_distance', '') or ''
        self.orbit_distance = float(orbit_dist_val.strip()) if orbit_dist_val and orbit_dist_val.strip() else 0.0

        radius_val = row.get('radius', '') or ''
        self.radius = float(radius_val.strip()) if radius_val and radius_val.strip() else 10.0

        self.color = row.get('color', '#888888').strip()
        self.image_path = row.get('image_path', '').strip()  # Path to image file

        # Starting position (0-359 degrees, 0° = top, clockwise)
        start_pos = row.get('start_position', '').strip()
        if start_pos:
            degrees = float(start_pos)
            # Convert degrees to radians, with 0° at top
            # Standard math: 0° = right (east), but we want 0° = top (north)
            # So subtract 90° to rotate coordinate system
            self.angle = math.radians(degrees - 90)
            self.has_start_position = True
        else:
            self.angle = 0.0
            self.has_start_position = False

        # Tooltip info
        self.description = row.get('description', '').strip()
        self.region = row.get('region', '').strip()
        self.faction = row.get('faction', '').strip()
        self.population = row.get('population', '').strip()

        # Display settings
        self.show_label = row.get('show_label', 'true').strip().lower() in ('true', '1', 'yes')
        self.orbit_color = row.get('orbit_color', '').strip()  # Empty = use default
        self.orbit_style = row.get('orbit_style', 'solid').strip()  # solid, dashed, dotted

        # Orbit shape settings (v5)
        orbit_shape_val = row.get('orbit_shape', '') or ''
        self.orbit_shape = orbit_shape_val.strip().lower() if orbit_shape_val else 'circle'

        orbit_ecc_val = row.get('orbit_eccentricity', '') or ''
        self.orbit_eccentricity = float(orbit_ecc_val.strip()) if orbit_ecc_val and orbit_ecc_val.strip() else 0.0

        orbit_rot_val = row.get('orbit_rotation', '') or ''
        self.orbit_rotation = float(orbit_rot_val.strip()) if orbit_rot_val and orbit_rot_val.strip() else 0.0

        # Location ID for navigation back to entry
        self.location_id = row.get('location_id', '').strip()

        # Asteroid ring specific (for type=asteroid_ring)
        if self.type == 'asteroid_ring':
            ring_width_str = row.get('ring_width', '20')
            if ring_width_str and ring_width_str.strip():
                self.ring_width = float(ring_width_str.strip())
            else:
                self.ring_width = 20.0
        else:
            self.ring_width = 0

        # Calculated during generation
        self.x = 0.0
        self.y = 0.0
        self.parent_x = 0.0
        self.parent_y = 0.0


class CSVStarSystemGenerator:
    """Generates star systems from CSV configuration"""

    def __init__(self, width=2400, height=2400):
        self.width = width
        self.height = height
        self.center_x = width / 2
        self.center_y = height / 2
        # Extended background dimensions (larger than viewport to avoid seeing edges)
        self.bg_width = width * 1.5
        self.bg_height = height * 1.5
        self.bodies: List[CelestialBodyConfig] = []
        self.image_cache: Dict[str, str] = {}  # Path -> base64 data URL

        # Configuration settings (can be set via CSV)
        self.background_color = '#0a0a12'  # Default dark space
        self.background_image = ''  # Path to background image
        self.background_type = 'starfield'  # Type: color, image, starfield, nebula, gradient, space
        self.nebula_colors = []  # Custom nebula colors (comma-separated in CSV)
        self.font_family = "'Helvetica Neue', Arial, sans-serif"  # Default font
        self.default_orbit_color = '#2A3A4A'  # Default orbit path color
        self.default_orbit_style = 'solid'  # Default orbit style

    def load_csv(self, csv_path: str):
        """Load celestial bodies and configuration from CSV file"""
        with open(csv_path, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Check if this is a configuration row
                row_type = row.get('type', '').strip().lower()
                if row_type == 'config':
                    # Load configuration settings
                    if row.get('background_color'):
                        self.background_color = row.get('background_color').strip()
                    if row.get('background_image'):
                        self.background_image = row.get('background_image').strip()
                    if row.get('background_type'):
                        self.background_type = row.get('background_type').strip().lower()
                    if row.get('nebula_colors'):
                        # Parse comma-separated colors
                        colors_str = row.get('nebula_colors').strip()
                        if colors_str:
                            self.nebula_colors = [c.strip() for c in colors_str.split(',')]
                    if row.get('font_family'):
                        self.font_family = row.get('font_family').strip()
                    if row.get('orbit_color'):
                        self.default_orbit_color = row.get('orbit_color').strip()
                    if row.get('orbit_style'):
                        self.default_orbit_style = row.get('orbit_style').strip()
                else:
                    # Regular celestial body
                    body = CelestialBodyConfig(row)
                    self.bodies.append(body)

    def encode_image(self, image_path: str) -> Optional[str]:
        """Convert image file to base64 data URL for embedding (cached)"""
        if not image_path:
            return None

        # Check cache first (important for performance)
        if image_path in self.image_cache:
            return self.image_cache[image_path]

        if not os.path.exists(image_path):
            print(f"Warning: Image file not found: {image_path}")
            return None

        try:
            file_size = os.path.getsize(image_path)
            filename = os.path.basename(image_path)

            # Show progress for large files
            if file_size > 1_000_000:  # > 1MB
                print(f"Loading {filename} ({file_size // 1_000_000}MB)...")

            with open(image_path, 'rb') as f:
                image_data = f.read()

            # Detect image format from extension
            ext = os.path.splitext(image_path)[1].lower()
            mime_types = {
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.gif': 'image/gif',
                '.svg': 'image/svg+xml'
            }
            mime_type = mime_types.get(ext, 'image/png')

            # Create data URL
            b64_data = base64.b64encode(image_data).decode('utf-8')
            data_url = f"data:{mime_type};base64,{b64_data}"

            # Cache it
            self.image_cache[image_path] = data_url

            if file_size > 1_000_000:
                print(f"  ✓ Encoded {filename}")

            return data_url
        except Exception as e:
            print(f"Warning: Could not load image {image_path}: {e}")
            return None

    def generate_procedural_background(self) -> str:
        """Generate SVG elements for procedural backgrounds (optimized for performance)"""
        import random

        bg_type = self.background_type.lower()
        parts = []

        # Base color rect
        parts.append(f'    <rect width="100%" height="100%" fill="{self.background_color}"/>')

        if bg_type == 'color':
            # Just solid color, already added above
            pass

        elif bg_type == 'gradient':
            # Radial gradient from center
            parts.append('''    <defs>
        <radialGradient id="bg-gradient" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stop-color="#0a0a15" stop-opacity="1"/>
            <stop offset="100%" stop-color="#050510" stop-opacity="1"/>
        </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg-gradient)"/>''')

        elif bg_type == 'starfield':
            # Optimized: Fewer but larger stars for same visual coverage
            random.seed(1234)  # Fixed seed for consistency
            num_stars = 500  # Increased for larger area coverage
            # Offset to center the extended background
            offset_x = (self.bg_width - self.width) / 2
            offset_y = (self.bg_height - self.height) / 2
            for _ in range(num_stars):
                x = random.uniform(-offset_x, self.width + offset_x)
                y = random.uniform(-offset_y, self.height + offset_y)
                size = random.uniform(0.8, 2.5)  # Larger than before (was 0.5-2.0)
                opacity = random.uniform(0.4, 0.95)  # Brighter minimum (was 0.3)
                parts.append(f'    <circle cx="{x:.1f}" cy="{y:.1f}" r="{size:.1f}" fill="white" opacity="{opacity:.2f}"/>')

        elif bg_type == 'nebula':
            # Optimized: Same number of clouds but fewer stars
            random.seed(54422)
            parts.append('''    <defs>
        <filter id="nebula-blur">
            <feGaussianBlur in="SourceGraphic" stdDeviation="80"/>
        </filter>
    </defs>''')

            # Use custom colors if provided, otherwise defaults
            if self.nebula_colors:
                colors = self.nebula_colors
            else:
                colors = ['#2a2a5a', '#4a2a4a', '#2a4a4a', '#4a4a2a', '#5a2a5a', '#2a5a5a']

            # Offset to center the extended background
            offset_x = (self.bg_width - self.width) / 2
            offset_y = (self.bg_height - self.height) / 2

            # Nebula clouds covering extended area
            for i in range(8):
                x = random.uniform(-offset_x + self.bg_width * 0.05, self.width + offset_x - self.bg_width * 0.05)
                y = random.uniform(-offset_y + self.bg_height * 0.05, self.height + offset_y - self.bg_height * 0.05)
                r = random.uniform(500, 1000)  # Larger clouds (was 250-550)
                color = random.choice(colors)
                opacity = random.uniform(0.3, 0.6)
                parts.append(f'    <circle cx="{x:.0f}" cy="{y:.0f}" r="{r:.0f}" fill="{color}" opacity="{opacity:.2f}" filter="url(#nebula-blur)"/>')

            # Optimized: Fewer but larger/brighter stars on top
            num_stars = 150  # Increased for larger area coverage
            for _ in range(num_stars):
                x = random.uniform(-offset_x, self.width + offset_x)
                y = random.uniform(-offset_y, self.height + offset_y)
                size = random.uniform(0.7, 2.8)  # Larger (was 0.4-2.2)
                opacity = random.uniform(0.4, 0.98)  # Brighter (was 0.3-0.95)
                # Mix of white and slightly colored stars
                if random.random() < 0.9:
                    color = 'white'
                else:
                    color = random.choice(['#ffffdd', '#ddddff', '#ffdddd', '#ddffdd'])
                parts.append(f'    <circle cx="{x:.1f}" cy="{y:.1f}" r="{size:.1f}" fill="{color}" opacity="{opacity:.2f}"/>')

        elif bg_type == 'space':
            # Optimized: Combination with fewer stars
            random.seed(12345)

            # Gradient
            parts.append('''    <defs>
        <radialGradient id="space-gradient" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stop-color="#0f0f1a" stop-opacity="1"/>
            <stop offset="100%" stop-color="#050508" stop-opacity="1"/>
        </radialGradient>
        <filter id="space-nebula-blur">
            <feGaussianBlur in="SourceGraphic" stdDeviation="100"/>
        </filter>
    </defs>
    <rect width="100%" height="100%" fill="url(#space-gradient)"/>''')

            # Offset to center the extended background
            offset_x = (self.bg_width - self.width) / 2
            offset_y = (self.bg_height - self.height) / 2

            # Nebula clouds (subtle) - covering extended area
            colors = ['#1a1a3a', '#2a1a2a', '#1a2a3a']
            for i in range(4):
                x = random.uniform(-offset_x + self.bg_width * 0.1, self.width + offset_x - self.bg_width * 0.1)
                y = random.uniform(-offset_y + self.bg_height * 0.1, self.height + offset_y - self.bg_height * 0.1)
                r = random.uniform(300, 500)  # Larger (was 250-450)
                color = random.choice(colors)
                opacity = random.uniform(0.1, 0.2)
                parts.append(f'    <circle cx="{x:.0f}" cy="{y:.0f}" r="{r:.0f}" fill="{color}" opacity="{opacity:.2f}" filter="url(#space-nebula-blur)"/>')

            # Optimized: Fewer but larger/brighter stars
            num_stars = 180  # Increased for larger area coverage
            for _ in range(num_stars):
                x = random.uniform(-offset_x, self.width + offset_x)
                y = random.uniform(-offset_y, self.height + offset_y)
                size = random.uniform(0.6, 3.0)  # Larger (was 0.3-2.5)
                opacity = random.uniform(0.3, 0.98)  # Brighter max (was 0.2-0.95)
                # Mix of white and slightly colored stars
                if random.random() < 0.85:
                    color = 'white'
                else:
                    color = random.choice(['#ffffdd', '#ddddff', '#ffdddd'])
                parts.append(f'    <circle cx="{x:.1f}" cy="{y:.1f}" r="{size:.1f}" fill="{color}" opacity="{opacity:.2f}"/>')

        return '\n'.join(parts)

    def calculate_positions(self):
        """Calculate initial positions for all bodies based on parent relationships"""
        import random

        # First pass: position primary star(s) at center
        primary_star = None
        for body in self.bodies:
            if body.type == 'star' and not body.parent:
                body.x = self.center_x
                body.y = self.center_y
                body.parent_x = self.center_x
                body.parent_y = self.center_y
                body.angle = 0
                primary_star = body
                break

        # Position companion stars orbiting the primary
        for body in self.bodies:
            if body.type == 'star' and body.parent and primary_star:
                # Use starting angle if not explicitly set in CSV
                if not body.has_start_position:
                    body.angle = random.uniform(0, 2 * math.pi)
                body.x = primary_star.x + body.orbit_distance * math.cos(body.angle)
                body.y = primary_star.y + body.orbit_distance * math.sin(body.angle)
                body.parent_x = primary_star.x
                body.parent_y = primary_star.y

        # Build parent lookup
        body_lookup = {body.name: body for body in self.bodies}

        # Multiple passes to handle nested hierarchies (stars -> planets -> moons)
        max_passes = 5
        for _ in range(max_passes):
            for body in self.bodies:
                # Skip if already positioned
                if body.x != 0 or body.y != 0:
                    continue

                # Find parent
                if body.parent and body.parent in body_lookup:
                    parent = body_lookup[body.parent]

                    # Only position if parent is already positioned
                    if parent.x != 0 or parent.y != 0 or (parent.type == 'star' and not parent.parent):
                        # Use starting angle if not explicitly set in CSV, otherwise random
                        if not body.has_start_position:
                            body.angle = random.uniform(0, 2 * math.pi)

                        # Position relative to parent
                        body.x = parent.x + body.orbit_distance * math.cos(body.angle)
                        body.y = parent.y + body.orbit_distance * math.sin(body.angle)
                        body.parent_x = parent.x
                        body.parent_y = parent.y

    def generate_svg(self) -> str:
        """Generate SVG content for the star system"""
        svg_parts = []

        # SVG header
        svg_parts.append(f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{self.width}" height="{self.height}" viewBox="0 0 {self.width} {self.height}" xmlns="http://www.w3.org/2000/svg">
    <!-- Star System from CSV Configuration -->

    <!-- Define filters for glows -->
    <defs>
        <filter id="star-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3"/>
        </filter>
    </defs>

    <!-- Background -->''')

        # Background - check type
        if self.background_image and self.background_type == 'image':
            # Use image background
            bg_data = self.encode_image(self.background_image)
            if bg_data:
                svg_parts.append(f'    <image href="{bg_data}" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"/>')
            else:
                # Fallback to procedural if image fails
                svg_parts.append(self.generate_procedural_background())
        else:
            # Use procedural background
            svg_parts.append(self.generate_procedural_background())

        svg_parts.append('''
    <!-- Orbital Paths -->
    <g id="orbital-paths">''')

        # Draw orbital paths - ONLY for bodies orbiting the PRIMARY star
        # Find primary star
        primary_star = next((b for b in self.bodies if b.type == 'star' and not b.parent), None)

        for body in self.bodies:
            # Skip asteroid rings (they're drawn differently)
            if body.type == 'asteroid_ring':
                continue

            if body.orbit_distance > 0 and body.parent:
                # Find parent body
                parent_body = next((b for b in self.bodies if b.name == body.parent), None)
                # Only draw orbit if parent is the primary star (not companion stars)
                if parent_body and parent_body == primary_star:
                    # Determine orbit color and style
                    orbit_color = body.orbit_color if body.orbit_color else self.default_orbit_color
                    orbit_style = body.orbit_style if body.orbit_style else self.default_orbit_style

                    # Set stroke-dasharray based on style
                    if orbit_style == 'dashed':
                        dasharray = '8,4'
                    elif orbit_style == 'dotted':
                        dasharray = '2,3'
                    else:  # solid
                        dasharray = 'none'

                    # Draw orbit based on shape
                    if body.orbit_shape == 'ellipse' and body.orbit_eccentricity > 0:
                        # Calculate ellipse parameters
                        # Semi-major axis (a) is the orbit_distance
                        a = body.orbit_distance
                        # Semi-minor axis (b) based on eccentricity: b = a * sqrt(1 - e^2)
                        e = min(body.orbit_eccentricity, 0.99)  # Cap at 0.99 to avoid degenerate ellipse
                        b = a * math.sqrt(1 - e * e)

                        # Rotation angle in degrees
                        rotation = body.orbit_rotation

                        # SVG ellipse element with transform for rotation
                        if rotation != 0:
                            svg_parts.append(f'        <ellipse cx="{body.parent_x}" cy="{body.parent_y}" '
                                           f'rx="{a}" ry="{b}" '
                                           f'transform="rotate({rotation} {body.parent_x} {body.parent_y})" '
                                           f'fill="none" stroke="{orbit_color}" stroke-width="1" '
                                           f'stroke-dasharray="{dasharray}" opacity="0.4"/>')
                        else:
                            svg_parts.append(f'        <ellipse cx="{body.parent_x}" cy="{body.parent_y}" '
                                           f'rx="{a}" ry="{b}" '
                                           f'fill="none" stroke="{orbit_color}" stroke-width="1" '
                                           f'stroke-dasharray="{dasharray}" opacity="0.4"/>')
                    else:
                        # Circular orbit (default)
                        svg_parts.append(f'        <circle cx="{body.parent_x}" cy="{body.parent_y}" r="{body.orbit_distance}" '
                                       f'fill="none" stroke="{orbit_color}" stroke-width="1" '
                                       f'stroke-dasharray="{dasharray}" opacity="0.4"/>')

        svg_parts.append('    </g>\n')

        # Celestial bodies
        svg_parts.append('    <!-- Celestial Bodies -->')
        svg_parts.append('    <g id="celestial-bodies">')

        body_id = 0
        for body in self.bodies:
            body_id_str = f"body-{body_id}"

            # Check if body has an image
            image_data = self.encode_image(body.image_path) if body.image_path else None

            if body.type == 'star':
                # Stars with glow effect
                svg_parts.append(f'        <!-- {body.name} -->')
                if image_data:
                    # Use image for star
                    svg_parts.append(f'        <image id="{body_id_str}" x="{body.x - body.radius}" y="{body.y - body.radius}" '
                                   f'width="{body.radius * 2}" height="{body.radius * 2}" href="{image_data}"/>')
                else:
                    # Draw star as circle with gradient
                    gradient_id = f"star-gradient-{body_id}"
                    svg_parts.append(f'        <defs>')
                    svg_parts.append(f'            <radialGradient id="{gradient_id}">')
                    svg_parts.append(f'                <stop offset="0%" stop-color="{body.color}" stop-opacity="1"/>')
                    svg_parts.append(f'                <stop offset="100%" stop-color="{body.color}" stop-opacity="0.3"/>')
                    svg_parts.append(f'            </radialGradient>')
                    svg_parts.append(f'        </defs>')
                    svg_parts.append(f'        <circle id="glow-{body_id}" cx="{body.x}" cy="{body.y}" r="{body.radius * 2}" '
                                   f'fill="url(#{gradient_id})" opacity="0.4" filter="url(#star-glow)"/>')
                    svg_parts.append(f'        <circle id="{body_id_str}" cx="{body.x}" cy="{body.y}" r="{body.radius}" fill="{body.color}"/>')

            elif body.type == 'planet':
                svg_parts.append(f'        <!-- {body.name} -->')
                if image_data:
                    svg_parts.append(f'        <image id="{body_id_str}" x="{body.x - body.radius}" y="{body.y - body.radius}" '
                                   f'width="{body.radius * 2}" height="{body.radius * 2}" href="{image_data}"/>')
                else:
                    svg_parts.append(f'        <circle id="{body_id_str}" cx="{body.x}" cy="{body.y}" r="{body.radius}" '
                                   f'fill="{body.color}" stroke="#4A5568" stroke-width="0.8" opacity="0.9"/>')

            elif body.type == 'moon':
                if image_data:
                    svg_parts.append(f'        <image id="{body_id_str}" x="{body.x - body.radius}" y="{body.y - body.radius}" '
                                   f'width="{body.radius * 2}" height="{body.radius * 2}" href="{image_data}"/>')
                else:
                    svg_parts.append(f'        <circle id="{body_id_str}" cx="{body.x}" cy="{body.y}" r="{body.radius}" '
                                   f'fill="{body.color}" opacity="0.8"/>')

            elif body.type == 'station':
                svg_parts.append(f'        <!-- {body.name} -->')
                if image_data:
                    svg_parts.append(f'        <image id="{body_id_str}" x="{body.x - body.radius}" y="{body.y - body.radius}" '
                                   f'width="{body.radius * 2}" height="{body.radius * 2}" href="{image_data}"/>')
                else:
                    # Default geometric shape for stations - centered at origin for easier transform
                    svg_parts.append(f'        <g id="{body_id_str}" transform="translate({body.x}, {body.y})">')
                    svg_parts.append(f'            <rect x="{-body.radius}" y="{-body.radius}" '
                                   f'width="{body.radius * 2}" height="{body.radius * 2}" '
                                   f'fill="none" stroke="{body.color}" stroke-width="1.5"/>')
                    svg_parts.append(f'            <circle cx="0" cy="0" r="1.5" fill="{body.color}"/>')
                    svg_parts.append(f'        </g>')

            elif body.type == 'asteroid_ring':
                # Draw asteroid ring as particles only (no boundary circles)
                svg_parts.append(f'        <!-- {body.name} - Asteroid Ring -->')
                inner_radius = body.orbit_distance - (body.ring_width / 2)
                outer_radius = body.orbit_distance + (body.ring_width / 2)

                # Add random asteroid particles in the ring
                import random
                random.seed(hash(body.name))  # Consistent random based on name
                num_particles = int(body.orbit_distance / 1)  # Increased density (was /10)
                for i in range(num_particles):
                    angle = random.uniform(0, 2 * math.pi)
                    distance = random.uniform(inner_radius, outer_radius)
                    particle_x = body.parent_x + distance * math.cos(angle)
                    particle_y = body.parent_y + distance * math.sin(angle)
                    # Varied asteroid sizes from tiny to larger chunks
                    particle_size = random.uniform(0.3, 3.5)
                    svg_parts.append(f'        <circle cx="{particle_x}" cy="{particle_y}" r="{particle_size}" '
                                   f'fill="{body.color}" opacity="{random.uniform(0.4, 0.8)}"/>')

            body_id += 1

        svg_parts.append('    </g>\n')

        # Labels
        svg_parts.append('    <!-- Labels -->')
        svg_parts.append(f'    <g id="labels" font-family="{self.font_family}" letter-spacing="0.5">')

        label_id = 0
        for body in self.bodies:
            # Skip labels for asteroid rings and bodies with show_label=false
            if body.type == 'asteroid_ring' or not body.show_label:
                label_id += 1
                continue

            label_id_str = f"label-{label_id}"
            label_y = body.y + body.radius + 14
            if body.type == 'star':
                label_y = body.y + body.radius + 25
                svg_parts.append(f'        <text id="{label_id_str}" x="{body.x}" y="{label_y}" text-anchor="middle" '
                               f'font-weight="300" font-size="13" fill="#C0C8D0" opacity="0.9">{body.name}</text>')
            elif body.type == 'planet':
                svg_parts.append(f'        <text id="{label_id_str}" x="{body.x}" y="{label_y}" text-anchor="middle" '
                               f'font-weight="300" font-size="10" fill="#A0A8B0" opacity="0.85">{body.name}</text>')
            elif body.type == 'station':
                # Use station color, or default to light color if no color specified
                station_color = body.color if body.color and body.color != '#888888' else '#9EA8B0'
                svg_parts.append(f'        <text id="{label_id_str}" x="{body.x}" y="{label_y}" text-anchor="middle" '
                               f'font-weight="400" font-size="9" fill="{station_color}" opacity="0.9">{body.name}</text>')
            label_id += 1

        svg_parts.append('    </g>')
        svg_parts.append('</svg>')

        return '\n'.join(svg_parts)

    def generate_interactive_html(self) -> str:
        """Generate interactive HTML with animation"""
        svg_content = self.generate_svg()

        # Generate JSON data for bodies (exclude asteroid rings - they don't animate)
        # IMPORTANT: Use the same ID indexing as SVG generation (includes asteroid rings in count)
        import json
        bodies_data = []
        for idx, body in enumerate(self.bodies):
            if body.type == 'asteroid_ring':
                continue  # Skip asteroid rings in interactive data
            bodies_data.append({
                'name': body.name,
                'type': body.type,
                'x': body.x,
                'y': body.y,
                'radius': body.radius,
                'color': body.color,
                'orbit_radius': body.orbit_distance,
                'angle': body.angle,
                'parent_x': body.parent_x,
                'parent_y': body.parent_y,
                'id': idx,  # This matches the SVG body_id which includes asteroid rings
                'description': body.description,
                'region': body.region,
                'faction': body.faction,
                'population': body.population,
                'image_data_url': (self.encode_image(body.image_path) if body.image_path else None),
                'has_image': bool(self.encode_image(body.image_path) if body.image_path else None),
                # v5: Orbit shape data
                'orbit_shape': body.orbit_shape,
                'orbit_eccentricity': body.orbit_eccentricity,
                'orbit_rotation': body.orbit_rotation,
                # v6: Location ID for navigation
                'location_id': body.location_id
            })

        bodies_json = json.dumps(bodies_data)

        html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Star System - Interactive Navigation Chart</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}

        body {{
            background: {self.background_color};
            font-family: {self.font_family};
            overflow: hidden;
            color: #C0C8D0;
        }}

        #container {{
            width: 100vw;
            height: 100vh;
            position: relative;
            cursor: grab;
        }}

        #container.grabbing {{
            cursor: grabbing;
        }}

        #svg-container {{
            width: 100%;
            height: 100%;
            transform-origin: 0 0;
        }}

        svg {{
            display: block;
            width: 100%;
            height: 100%;
        }}

        /* Right-side UI column (controls + inspector panel) */
        #ui-right {{
            position: absolute;
            top: 20px;
            right: 20px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            z-index: 200;
            width: 280px;
            max-width: 34vw;
        }}

        #info-panel {{
            background: rgba(20, 20, 30, 0.9);
            border: 1px solid #3A4A5A;
            border-radius: 4px;
            padding: 12px;
            font-size: 12px;
            line-height: 1.5;
            max-height: calc(100vh - 220px);
            overflow: auto;
        }}

        .info-placeholder {{
            color: #6B7A8A;
            font-size: 11px;
        }}

        .info-header {{
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            gap: 10px;
            margin-bottom: 10px;
        }}

        .info-name {{
            font-weight: 500;
            font-size: 14px;
            color: #E0E8F0;
        }}

        .info-type {{
            color: #8B9AAA;
            text-transform: capitalize;
            font-size: 11px;
            white-space: nowrap;
        }}

        .lock-badge {{
            font-size: 10px;
            color: #E8C07A;
            border: 1px solid #5A4A3A;
            background: rgba(40, 30, 20, 0.6);
            padding: 2px 6px;
            border-radius: 999px;
            white-space: nowrap;
        }}

        .info-preview {{
            width: 100%;
            aspect-ratio: 1 / 1;
            background: rgba(10, 10, 18, 0.7);
            border: 1px solid #2A3440;
            border-radius: 4px;
            display: grid;
            place-items: center;
            margin-bottom: 10px;
            overflow: hidden;
        }}

        .info-preview img {{
            width: 100%;
            height: 100%;
            object-fit: contain;
            image-rendering: auto;
        }}

        .info-preview svg {{
            width: 85%;
            height: 85%;
        }}

        .info-lines {{
            color: #A0A8B0;
            font-size: 11px;
        }}

        .info-lines .label {{
            color: #8B9AAA;
        }}

        .go-to-entry-btn {{
            display: block;
            width: 100%;
            margin-top: 12px;
            padding: 8px 12px;
            background: #3B82F6;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            text-align: center;
            transition: background 0.15s;
        }}

        .go-to-entry-btn:hover {{
            background: #2563EB;
        }}

        #controls {{
            position: relative;
            background: rgba(20, 20, 30, 0.9);
            border: 1px solid #3A4A5A;
            padding: 12px;
            border-radius: 4px;
            font-size: 12px;
            width: 100%;
        }}


        #controls div {{
            margin-bottom: 8px;
        }}

        #controls div:last-child {{
            margin-bottom: 0;
        }}

        .control-row {{
            display: flex;
            align-items: center;
            justify-content: space-between;
        }}

        .control-label {{
            color: #8B9AAA;
            margin-right: 8px;
        }}

        button {{
            background: #2A3A4A;
            border: 1px solid #3A4A5A;
            color: #C0C8D0;
            padding: 6px 12px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
            margin-left: 4px;
        }}

        button:hover {{
            background: #3A4A5A;
        }}

        button:active {{
            background: #1A2A3A;
        }}
    </style>
</head>
<body>
    <div id="container">
        <div id="svg-container">
            {svg_content}
        </div>
    </div>

    <div id="ui-right">
        <div id="controls">
        <div class="control-row">
            <span class="control-label">Zoom:</span>
            <div>
                <button onclick="zoomIn()">+</button>
                <button onclick="zoomOut()">-</button>
                <button onclick="resetView()">Reset</button>
            </div>
        </div>
        <div class="control-row">
            <span class="control-label">Animation:</span>
            <button id="animToggle" onclick="toggleAnimation()">Play</button>
        </div>
        <div style="color: #6B7A8A; font-size: 10px; margin-top: 12px;">
            Mouse wheel to zoom<br>
            Click and drag to pan<br>
            Hover to inspect • Click to lock (click empty space to unlock)
        </div>
    </div>

        <div id="info-panel">
            <div class="info-placeholder">Hover an object to inspect it. Click an object to lock this panel; click empty space to unlock.</div>
        </div>
    </div>

    <script>
        // Body data for tooltips and animation
        const bodiesData = {bodies_json};

        // Zoom and pan state
        let scale = 1;
        let translateX = 0;
        let translateY = 0;
        let isDragging = false;
        let startX, startY;
        let lastTranslateX = 0;
        let lastTranslateY = 0;

        // Animation state
        let isAnimating = false;
        let animationFrame = null;
        let lastTime = 0;

        const container = document.getElementById('container');
        const svgContainer = document.getElementById('svg-container');
        const infoPanel = document.getElementById('info-panel');
        const svg = document.querySelector('svg');
        const animToggle = document.getElementById('animToggle');
        let lastHoverId = null;
        let lastHoverLocked = false;
        let lockedId = null;
        let mouseDownX = 0;
        let mouseDownY = 0;
        let draggedSinceMouseDown = false;

        function escapeHtml(value) {{
            return String(value ?? '').replace(/[&<>"']/g, (ch) => ({{
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }}[ch]));
        }}


        function screenPointToViewBox(clientX, clientY) {{
            const containerRect = container.getBoundingClientRect();
            const mouseScreenX = clientX - containerRect.left;
            const mouseScreenY = clientY - containerRect.top;

            // Must be inside the container
            if (mouseScreenX < 0 || mouseScreenY < 0 ||
                mouseScreenX > containerRect.width || mouseScreenY > containerRect.height) {{
                return null;
            }}

            // Undo pan/zoom (applied to #svg-container via CSS transform)
            const mouseLocalX = (mouseScreenX - translateX) / scale;
            const mouseLocalY = (mouseScreenY - translateY) / scale;

            // Convert from local pixel coordinates to SVG viewBox coordinates.
            // Assumes default preserveAspectRatio ("xMidYMid meet").
            const vb = svg.viewBox.baseVal;
            const viewportW = containerRect.width;
            const viewportH = containerRect.height;
            const fitScale = Math.min(viewportW / vb.width, viewportH / vb.height);
            const offsetX = (viewportW - vb.width * fitScale) / 2;
            const offsetY = (viewportH - vb.height * fitScale) / 2;

            const x = (mouseLocalX - offsetX) / fitScale + vb.x;
            const y = (mouseLocalY - offsetY) / fitScale + vb.y;

            // If we're in the letterboxed margin area, treat as "no hit"
            if (x < vb.x || x > vb.x + vb.width || y < vb.y || y > vb.y + vb.height) {{
                return null;
            }}

            return {{ x, y }};
        }}

        function findClosestBody(x, y) {{
            let closest = null;
            let minDist = Infinity;

            bodiesData.forEach(body => {{
                const dist = Math.sqrt(Math.pow(x - body.x, 2) + Math.pow(y - body.y, 2));
                const hoverRadius = Math.max(body.radius * 2, 12);
                if (dist < hoverRadius && dist < minDist) {{
                    minDist = dist;
                    closest = body;
                }}
            }});

            return closest;
        }}


        function renderPreview(body) {{
            if (body.image_data_url) {{
                return `
                    <div class="info-preview">
                        <img src="${{body.image_data_url}}" alt="${{escapeHtml(body.name)}} preview">
                    </div>
                `;
            }}

            // Default: render a simple vector preview based on type/color.
            const color = body.color || '#888888';
            let shape = '';

            if (body.type === 'station') {{
                shape = `
                    <rect x="22" y="22" width="56" height="56" fill="none" stroke="${{color}}" stroke-width="4"/>
                    <circle cx="50" cy="50" r="4" fill="${{color}}"/>
                `;
            }} else {{
                // star / planet / moon
                shape = `
                    <circle cx="50" cy="50" r="34" fill="${{color}}" stroke="#4A5568" stroke-width="2" opacity="0.95"/>
                `;
            }}

            return `
                <div class="info-preview">
                    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        ${{shape}}
                    </svg>
                </div>
            `;
        }}

        function goToEntry(locationId) {{
            // Post message to parent window to navigate to the location entry
            if (window.parent && window.parent !== window) {{
                window.parent.postMessage({{
                    type: 'navigate-to-location',
                    locationId: locationId
                }}, '*');
            }}
        }}

        function setInfoPanel(body, isLocked=false) {{
            if (!body || body.id === undefined || body.id === null) return;
            if (lastHoverId === body.id && lastHoverLocked === isLocked) return;
            lastHoverId = body.id;
            lastHoverLocked = isLocked;

            const lines = [];

            if (body.description) lines.push(`<div style="margin-top:6px;">${{escapeHtml(body.description)}}</div>`);
            if (body.region) lines.push(`<div><span class="label">Region:</span> ${{escapeHtml(body.region)}}</div>`);
            if (body.faction) lines.push(`<div><span class="label">Faction:</span> ${{escapeHtml(body.faction)}}</div>`);
            if (body.population) lines.push(`<div><span class="label">Population:</span> ${{escapeHtml(body.population)}}</div>`);

            // Only show "Go to Entry" button if we have a location_id
            const goToButton = body.location_id
                ? `<button class="go-to-entry-btn" onclick="goToEntry('${{escapeHtml(body.location_id)}}')">Go to Entry</button>`
                : '';

            infoPanel.innerHTML = `
                <div class="info-header">
                    <div>
                        <div class="info-name">${{escapeHtml(body.name)}}</div>
                        <div class="info-type">${{escapeHtml(body.type)}}</div>
                    </div>
                    ${{isLocked ? '<span class="lock-badge">Locked</span>' : ''}}
                </div>
                ${{renderPreview(body)}}
                <div class="info-lines">
                    ${{lines.join('')}}
                </div>
                ${{goToButton}}
            `;
        }}

        function clearInfoPanel() {{
            if (lastHoverId === null) return;
            lastHoverId = null;
            lastHoverLocked = false;
            infoPanel.innerHTML = `<div class="info-placeholder">Hover an object to inspect it. Click an object to lock this panel; click empty space to unlock.</div>`;
        }}


        // Zoom functions
        function updateTransform() {{
            svgContainer.style.transform = `translate(${{translateX}}px, ${{translateY}}px) scale(${{scale}})`;
        }}

        function zoomIn() {{
            scale = Math.min(scale * 1.3, 10);
            updateTransform();
        }}

        function zoomOut() {{
            scale = Math.max(scale / 1.3, 0.5);
            updateTransform();
        }}

        function resetView() {{
            scale = 1;
            translateX = 0;
            translateY = 0;
            lastTranslateX = 0;
            lastTranslateY = 0;
            updateTransform();
        }}

        // Mouse wheel zoom
        container.addEventListener('wheel', (e) => {{
            e.preventDefault();

            const rect = container.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const oldScale = scale;
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            scale = Math.max(0.8, Math.min(10, scale * delta));

            // Zoom towards mouse position
            const scaleChange = scale / oldScale;
            translateX = mouseX - (mouseX - translateX) * scaleChange;
            translateY = mouseY - (mouseY - translateY) * scaleChange;
            lastTranslateX = translateX;
            lastTranslateY = translateY;

            updateTransform();
        }});

        // Pan with mouse
        container.addEventListener('mousedown', (e) => {{
            if (e.button === 0) {{
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                mouseDownX = e.clientX;
                mouseDownY = e.clientY;
                draggedSinceMouseDown = false;
                container.classList.add('grabbing');
            }}
        }});

        // Combined mousemove handler for both dragging and tooltips
        document.addEventListener('mousemove', (e) => {{
            // Handle dragging
            if (isDragging) {{
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                if (Math.abs(dx) + Math.abs(dy) > 3) draggedSinceMouseDown = true;
                translateX = lastTranslateX + dx;
                translateY = lastTranslateY + dy;
                updateTransform();
                // Keep the inspector if it's locked; otherwise clear it while dragging
                if (lockedId === null) clearInfoPanel();
                return;
            }}

            // If the inspector is locked, ignore hover updates
            if (lockedId !== null) return;

            // Handle tooltips when not dragging
            const pt = screenPointToViewBox(e.clientX, e.clientY);
            if (!pt) {{
                clearInfoPanel();
                return;
            }}

            const closest = findClosestBody(pt.x, pt.y);
            if (closest) {{
                setInfoPanel(closest);
            }} else {{
                clearInfoPanel();
            }}
        }});

        document.addEventListener('mouseup', () => {{
            if (isDragging) {{
                lastTranslateX = translateX;
                lastTranslateY = translateY;
                isDragging = false;
                container.classList.remove('grabbing');
            }}
        }});

        container.addEventListener('mouseleave', () => {{
            if (lockedId === null) clearInfoPanel();
        }});

        // Click to lock/unlock the inspector panel
        container.addEventListener('click', (e) => {{
            // Ignore clicks that were part of a drag gesture
            if (draggedSinceMouseDown) return;

            const pt = screenPointToViewBox(e.clientX, e.clientY);
            if (!pt) {{
                lockedId = null;
                clearInfoPanel();
                return;
            }}

            const hit = findClosestBody(pt.x, pt.y);

            if (hit) {{
                if (lockedId === hit.id) {{
                    // Toggle off if clicking the locked object again
                    lockedId = null;
                    clearInfoPanel();
                }} else {{
                    lockedId = hit.id;
                    setInfoPanel(hit, true);
                }}
            }} else {{
                // Clicked empty space: unlock + clear
                lockedId = null;
                clearInfoPanel();
            }}
        }});

        // Animation functions
        function toggleAnimation() {{
            isAnimating = !isAnimating;
            animToggle.textContent = isAnimating ? 'Pause' : 'Play';

            if (isAnimating) {{
                lastTime = performance.now();
                animationFrame = requestAnimationFrame(animate);
            }} else {{
                if (animationFrame) {{
                    cancelAnimationFrame(animationFrame);
                }}
            }}
        }}

        function animate(currentTime) {{
            if (!isAnimating) return;

            const deltaTime = (currentTime - lastTime) / 1000;
            lastTime = currentTime;

            if (isNaN(deltaTime) || !isFinite(deltaTime) || deltaTime > 0.1 || deltaTime <= 0) {{
                animationFrame = requestAnimationFrame(animate);
                return;
            }}

            bodiesData.forEach((body, idx) => {{
                if (body.orbit_radius === 0) return;

                let speed = 0.2 / Math.sqrt(Math.max(body.orbit_radius, 1));
                if (body.type === 'moon') speed *= 3;
                // Removed star speed penalty for better visualization

                body.angle += speed * deltaTime;

                let newX, newY;

                // Calculate position based on orbit shape (v5)
                if (body.orbit_shape === 'ellipse' && body.orbit_eccentricity > 0) {{
                    // Elliptical orbit
                    const a = body.orbit_radius;  // Semi-major axis
                    const e = Math.min(body.orbit_eccentricity, 0.99);
                    const b = a * Math.sqrt(1 - e * e);  // Semi-minor axis
                    const rotation = body.orbit_rotation * Math.PI / 180;  // Convert to radians

                    // Position on ellipse
                    const x = a * Math.cos(body.angle);
                    const y = b * Math.sin(body.angle);

                    // Rotate the ellipse
                    const rotatedX = x * Math.cos(rotation) - y * Math.sin(rotation);
                    const rotatedY = x * Math.sin(rotation) + y * Math.cos(rotation);

                    newX = body.parent_x + rotatedX;
                    newY = body.parent_y + rotatedY;
                }} else {{
                    // Circular orbit (default)
                    newX = body.parent_x + body.orbit_radius * Math.cos(body.angle);
                    newY = body.parent_y + body.orbit_radius * Math.sin(body.angle);
                }}

                if (isNaN(newX) || isNaN(newY)) return;

                body.x = newX;
                body.y = newY;

                const bodyElement = document.getElementById(`body-${{body.id}}`);
                const labelElement = document.getElementById(`label-${{body.id}}`);

                if (bodyElement) {{
                    const tagName = bodyElement.tagName.toLowerCase();
                    if (tagName === 'circle') {{
                        bodyElement.setAttribute('cx', newX);
                        bodyElement.setAttribute('cy', newY);
                    }} else if (tagName === 'image') {{
                        bodyElement.setAttribute('x', newX - body.radius);
                        bodyElement.setAttribute('y', newY - body.radius);
                    }} else if (tagName === 'g') {{
                        // Handle station groups - translate the whole group
                        bodyElement.setAttribute('transform', `translate(${{newX}}, ${{newY}})`);
                    }}

                    // Update star glow if it exists
                    if (body.type === 'star') {{
                        const glowElement = document.getElementById(`glow-${{body.id}}`);
                        if (glowElement) {{
                            glowElement.setAttribute('cx', newX);
                            glowElement.setAttribute('cy', newY);
                        }}
                    }}
                }}

                if (labelElement) {{
                    labelElement.setAttribute('x', newX);
                    const labelY = newY + body.radius + (body.type === 'star' ? 25 : 14);
                    labelElement.setAttribute('y', labelY);
                }}

                // Update child positions
                if (body.type === 'planet' || body.type === 'star') {{
                    bodiesData.forEach(otherBody => {{
                        // Check if otherBody is a child of this body
                        // Planets and stars can have children
                        // - Planets can have moons and stations
                        // - Stars can have planets and other stars (companions)
                        const isChild = (body.type === 'planet' && (otherBody.type === 'moon' || otherBody.type === 'station')) ||
                                       (body.type === 'star' && (otherBody.type === 'planet' || otherBody.type === 'star'));

                        if (isChild) {{
                            const dist = Math.sqrt(
                                Math.pow(otherBody.parent_x - body.x, 2) +
                                Math.pow(otherBody.parent_y - body.y, 2)
                            );
                            if (dist < 1) {{
                                otherBody.parent_x = newX;
                                otherBody.parent_y = newY;
                            }}
                        }}
                    }});
                }}
            }});

            animationFrame = requestAnimationFrame(animate);
        }}
    </script>
</body>
</html>'''

        return html


def run_gui():
    """Run the GUI version of the generator using native macOS dialogs"""

    # Use osascript to show native macOS file picker
    applescript = '''
    try
        set csvFile to choose file with prompt "Select CSV Star System File:" of type {"csv", "public.comma-separated-values-text"}
        return POSIX path of csvFile
    on error number -128
        return ""
    end try
    '''

    try:
        result = subprocess.run(
            ['osascript', '-e', applescript],
            capture_output=True,
            text=True,
            check=True
        )
        csv_file = result.stdout.strip()

        if not csv_file:
            # User cancelled
            return
    except subprocess.CalledProcessError:
        # Error running osascript
        print("❌ Error: Could not show file picker")
        return

    try:
        # Get the directory where the CSV file is located (for output and relative paths)
        csv_dir = os.path.dirname(os.path.abspath(csv_file))

        # Change to CSV directory so relative image paths work
        original_dir = os.getcwd()
        os.chdir(csv_dir)

        # Generate output filename based on CSV name in the same folder as CSV
        csv_basename = os.path.splitext(os.path.basename(csv_file))[0]
        output_file = os.path.join(csv_dir, f"{csv_basename}.html")

        # Create generator
        print("━" * 50)
        print("Star System Generator v6")
        print("━" * 50)
        generator = CSVStarSystemGenerator(width=2400, height=2400)

        # Load CSV
        print(f"\n📄 Loading CSV: {os.path.basename(csv_file)}")
        generator.load_csv(csv_file)
        print(f"   ✓ Loaded {len(generator.bodies)} celestial bodies")

        # Calculate positions
        print(f"\n📐 Calculating orbital positions...")
        generator.calculate_positions()
        print(f"   ✓ Positions calculated")

        # Generate HTML
        print(f"\n🌌 Generating interactive HTML...")
        print(f"   (this may take a moment for large images)")
        html_content = generator.generate_interactive_html()

        # File size in MB
        size_mb = len(html_content) / (1024 * 1024)
        print(f"   ✓ HTML generated ({size_mb:.1f}MB)")

        # Write to file
        print(f"\n💾 Writing to: {os.path.basename(output_file)}")
        with open(output_file, 'w') as f:
            f.write(html_content)
        print(f"   ✓ File saved")

        # Restore original directory
        os.chdir(original_dir)

        print("\n✨ Generation complete!")
        print("━" * 50)

        # Show success message using native macOS dialog
        success_script = f'''
        display dialog "Star system generated successfully!

Output file: {os.path.basename(output_file)}
File size: {size_mb:.1f}MB
Bodies: {len(generator.bodies)}

Location: {csv_dir}" with title "Success!" buttons {{"OK"}} default button "OK" with icon note
        '''
        subprocess.run(['osascript', '-e', success_script], check=False)

    except Exception as e:
        # Make sure to restore directory even on error
        try:
            os.chdir(original_dir)
        except:
            pass

        # Show error using native macOS dialog
        error_msg = str(e).replace('"', '\\"')  # Escape quotes for AppleScript
        print(f"\n❌ Error: {str(e)}")
        error_script = f'''
        display dialog "Failed to generate star system:

{error_msg}" with title "Error" buttons {{"OK"}} default button "OK" with icon stop
        '''
        subprocess.run(['osascript', '-e', error_script], check=False)


if __name__ == '__main__':
    run_gui()
