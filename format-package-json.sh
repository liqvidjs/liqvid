FILTER=$(
  cat <<JQ
# types must come first
.exports |= with_entries(
    .value |= ({types, "@liqvid/dev", import, require} + . | with_entries(select(.value != null)))
)
|
# for development, we need "src/*" in the files array, but this should not be published to npm
.files |= del(.[] | select(. == "src/*"))
|
# sort fields
.dependencies |= (if . != null then (to_entries | sort_by(.key) | from_entries) else . end)
|
.devDependencies |= (if . != null then (to_entries | sort_by(.key) | from_entries) else . end)
|
.peerDependencies |= (if . != null then (to_entries | sort_by(.key) | from_entries) else . end)
|
.scripts |= (if . != null then (to_entries | sort_by(.key) | from_entries) else . end)
|
# final
{
  name,
  version,
  description,
  license,
  author,
  homepage,
  repository,
  bugs,
  files,
  exports,
  scripts,
  dependencies,
  devDependencies,
  peerDependencies,
  peerDependenciesMeta,
  sideEffects,
  type,
} + .
| with_entries(select(.value != null))
JQ
)

cat package.json | jq "$FILTER" >package-fmt.json

# ensure file is non-empty
if [ -s package-fmt.json ]; then
  mv package-fmt.json package.json
else
  echo "Error: package-fmt.json is empty. Aborting."
  rm package-fmt.json
  exit 1
fi
