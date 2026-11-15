#!/bin/sh
# 运行时配置改变脚本内容，所有分块及相互引用使用同一内容版本以隔离缓存。
set -eu
asset_root=/usr/share/nginx/html
work_dir=$(mktemp -d)
trap 'rm -f "$work_dir/files" "$work_dir/rules"; rmdir "$work_dir"' EXIT
find "$asset_root/assets" -maxdepth 1 -type f -name '*.js' ! -name '*.runtime-*.js' | LC_ALL=C sort > "$work_dir/files"
[ -s "$work_dir/files" ]
runtime_hash=$(while IFS= read -r source_file; do sha256sum "$source_file"; done < "$work_dir/files" | sha256sum | cut -c1-16)
while IFS= read -r source_file; do
    original_name=$(basename "$source_file")
    printf 's|%s\\.js|%s.runtime-%s.js|g\n' "${original_name%.js}" "${original_name%.js}" "$runtime_hash" >> "$work_dir/rules"
done < "$work_dir/files"
while IFS= read -r source_file; do
    runtime_file="${source_file%.js}.runtime-${runtime_hash}.js"
    sed -f "$work_dir/rules" "$source_file" > "$runtime_file.tmp"
    chmod 644 "$runtime_file.tmp"
    mv "$runtime_file.tmp" "$runtime_file"
done < "$work_dir/files"
sed -f "$work_dir/rules" "$asset_root/index.html" > "$asset_root/index.html.runtime.tmp"
chmod 644 "$asset_root/index.html.runtime.tmp"
mv "$asset_root/index.html.runtime.tmp" "$asset_root/index.html"
