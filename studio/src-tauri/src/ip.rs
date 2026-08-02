use crate::models::{HdlPattern, PatternCatalog};
use crate::security::canonical_workspace;
use std::fs;

pub fn patterns(root: &str) -> Result<Vec<HdlPattern>, String> {
    let root = canonical_workspace(root)?;
    let path = root.join("ip/catalog.json");
    let metadata = fs::metadata(&path)
        .map_err(|_| "The packaged HDL pattern catalog is missing".to_owned())?;
    if metadata.len() > 4 * 1024 * 1024 {
        return Err("The HDL pattern catalog exceeds the 4 MiB safety limit".into());
    }
    let catalog: PatternCatalog = serde_json::from_slice(
        &fs::read(&path).map_err(|error| format!("Cannot read HDL pattern catalog: {error}"))?,
    )
    .map_err(|error| format!("HDL pattern catalog is invalid JSON: {error}"))?;
    if catalog.schema_version != 1 {
        return Err(format!(
            "Unsupported HDL pattern catalog schema {}",
            catalog.schema_version
        ));
    }
    if catalog.patterns.len() > 500 {
        return Err("The HDL pattern catalog contains more than 500 entries".into());
    }
    Ok(catalog.patterns)
}
