FILTER=$(
  cat <<JQ
# types must come first
.exports |= with_entries(
    .value |=
      if type == "object" then
        ({"@liqvid/dev", types, import, require} + . | with_entries(select(.value != null)))
      else . end
)
|
# for development, we need "src/*" in the files array, but this should not be published to npm
.files |= del(.[] | select(. == "src/*"))
|
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
