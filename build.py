#!/usr/bin/env python3
"""
build.py — Bundle JS modules into a single inline <script type="module"> for file:// compatibility.

Usage:
    python3 build.py

Reads source files from js/ in dependency order, strips local import/export statements,
and writes a new index.html with all JS inlined. The original js/ source files are unchanged.
"""

import re
import os

# Dependency order: each file is processed once, in this sequence
JS_FILES = [
    'js/core/util.js',
    'js/core/scene.js',
    'js/core/textures.js',
    'js/core/helpers.js',
    'js/builders/furniture.js',
    'js/builders/plants.js',
    'js/builders/industrial.js',
    'js/builders/household.js',
    'js/builders/office.js',
    'js/builders/lab.js',
    'js/builders/instruments.js',
    'js/catalog.js',
    'js/presets.js',
    'js/app.js',
]

# Patterns for lines that reference our own local modules (to be stripped)
LOCAL_IMPORT_RE = re.compile(
    r"""^import\s+.*?\s+from\s+['"](?:\.{1,2}/)[^'"]*['"]\s*;?\s*$"""
)

# export { foo, bar }; or export { foo as bar };
EXPORT_BLOCK_RE = re.compile(r'^\s*export\s*\{[^}]*\}\s*;?\s*$')

# export default ...
EXPORT_DEFAULT_RE = re.compile(r'^export\s+default\s+')

# export const / export function / export let / export class / export async function
EXPORT_DECL_RE = re.compile(r'^(export\s+)((?:async\s+)?(?:function|class|const|let|var)\b)')


def strip_file(path):
    """Return lines of a JS file with local imports and export keywords stripped."""
    with open(path, encoding='utf-8') as f:
        lines = f.readlines()

    out = []
    i = 0
    while i < len(lines):
        line = lines[i]
        raw = line  # preserve newline

        # Skip local import lines (single-line form)
        if LOCAL_IMPORT_RE.match(line.rstrip('\n')):
            i += 1
            continue

        # Handle multi-line local imports: import { ... (continued on next lines)
        # Detect: starts with `import ` but no closing `from '...'` on this line
        stripped = line.strip()
        if stripped.startswith('import ') and 'from' not in line:
            # Accumulate until we find the `from '...'` line
            block = [line]
            j = i + 1
            while j < len(lines) and 'from' not in lines[j]:
                block.append(lines[j])
                j += 1
            if j < len(lines):
                block.append(lines[j])  # the `from '...'` line
                joined = ''.join(block)
                if LOCAL_IMPORT_RE.match(joined.rstrip('\n')):
                    i = j + 1
                    continue
                else:
                    out.extend(block)
                    i = j + 1
                    continue
            else:
                out.extend(block)
                i = j
                continue

        # Strip `export { ... };` blocks
        if EXPORT_BLOCK_RE.match(line.rstrip('\n')):
            i += 1
            continue

        # Strip multi-line `export { ... }` blocks
        if re.match(r'^\s*export\s*\{', line) and '}' not in line:
            j = i + 1
            while j < len(lines) and '}' not in lines[j]:
                j += 1
            i = j + 1  # skip past closing }
            continue

        # Strip `export default`
        if EXPORT_DEFAULT_RE.match(line.lstrip()):
            line = EXPORT_DEFAULT_RE.sub('', line.lstrip())
            raw = line

        # Strip `export ` prefix from declarations
        m = EXPORT_DECL_RE.match(line)
        if m:
            raw = line[len(m.group(1)):]

        out.append(raw)
        i += 1

    return out


def collect_cdn_imports(lines_list):
    """Collect all `import ... from 'three...'` lines across all files, deduplicated."""
    seen = set()
    result = []
    cdn_re = re.compile(r"""^import\s+.*?\s+from\s+['"](?:three)['"]\s*;?\s*$|^import\s+.*?\s+from\s+['"]three/""")
    for lines in lines_list:
        for line in lines:
            if cdn_re.match(line.strip()):
                key = line.strip()
                if key not in seen:
                    seen.add(key)
                    result.append(line)
    return result


def build():
    base = os.path.dirname(os.path.abspath(__file__))

    # Read and strip each file
    stripped = {}
    for rel in JS_FILES:
        path = os.path.join(base, rel)
        stripped[rel] = strip_file(path)

    # Collect CDN imports (three / three/addons)
    cdn_imports = collect_cdn_imports(stripped.values())

    # Build the combined script body (without CDN imports since they're hoisted)
    cdn_set = set(l.strip() for l in cdn_imports)
    cdn_re = re.compile(r"""^import\s+.*?\s+from\s+['"](?:three)['"]\s*;?\s*$|^import\s+.*?\s+from\s+['"]three/""")

    body_parts = []
    for rel in JS_FILES:
        lines = stripped[rel]
        # Remove CDN import lines (already hoisted)
        filtered = []
        for line in lines:
            if cdn_re.match(line.strip()):
                continue
            filtered.append(line)
        body_parts.append(f'// ===== {rel} =====\n')
        body_parts.extend(filtered)
        body_parts.append('\n')

    # Read index.html
    html_path = os.path.join(base, 'index.html')
    with open(html_path, encoding='utf-8') as f:
        html = f.read()

    # Build the inline script block
    cdn_block = ''.join(cdn_imports)
    body_block = ''.join(body_parts)
    inline_script = f'<script type="module">\n{cdn_block}\n{body_block}</script>'

    # Replace the external script tag
    new_html = re.sub(
        r'<script\s+type=["\']module["\']\s+src=["\'][^"\']+["\']>\s*</script>',
        inline_script,
        html
    )

    if new_html == html:
        print("WARNING: Could not find the external script tag to replace.")
        print("  Expected: <script type=\"module\" src=\"...\"></script>")
        return

    with open(html_path, encoding='utf-8', mode='w') as f:
        f.write(new_html)

    total_lines = sum(len(stripped[r]) for r in JS_FILES)
    print(f"Built index.html — {len(JS_FILES)} modules, ~{total_lines} source lines inlined.")
    print("The file:// CORS restriction is now bypassed (all JS is inline).")


if __name__ == '__main__':
    build()
