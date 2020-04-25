let sketch = require("sketch");
let Style = sketch.Style;
let Settings = sketch.Settings;
let UI = sketch.UI;

const doc = sketch.getSelectedDocument();
const selectedLayers = doc.selectedLayers;
const layerType = {
  ARTBOARD: "Artboard",
  SHAPEPATH: "ShapePath",
  SYMBOLINSTANCE: "SymbolInstance",
};
const overrideProperty = {
  IMAGE: "image",
};
const preferences = {
  EXPORT_OPTIONS: {
    scales: Settings.settingForKey("image-scales"),
    formats: "png",
    output: false,
  },
  IS_FLOW_ON: Settings.settingForKey("isFlowOn"),
  IS_SIZESYNC_ON: Settings.settingForKey("isSizeSyncOn"),
};
let shapeCounter = 0;
let symbolCounter = 0;

export function syncLayerSize(targetLayer, sourceArtboard) {
  targetLayer.frame.width = sourceArtboard.frame.width;
  targetLayer.frame.height = sourceArtboard.frame.height;
}

export function updateFlowToSourceArtboard(targetLayer, sourceArtboard) {
  if (preferences.IS_FLOW_ON) {
    targetLayer.flow = { target: sourceArtboard };
  } else {
    targetLayer.flow = undefined;
  }
}

export default function () {
  if (selectedLayers.length === 0) {
    // -----------------------------------
    // Display a message when no layers are selected
    UI.message("❌ Please select at least 1 artboard.");
  } else {
    selectedLayers.forEach((layer) => {
      if (layer.type != layerType.ARTBOARD) {
        // -----------------------------------
        // Display a message when layers with other types are selected
        UI.message("❌ Only content in artboards will be used for updating.");
      } else {
        const id = layer.id;
        const buffer = sketch.export(layer, preferences.EXPORT_OPTIONS);
        const newImg = sketch.createLayerFromData(buffer, "bitmap");
        const targetLayers = doc.getLayersNamed(layer.name);

        targetLayers.forEach((imglayer) => {
          if (id != imglayer.id && imglayer.type != layerType.ARTBOARD) {
            if (preferences.IS_SIZESYNC_ON) syncLayerSize(imglayer, layer);
            updateFlowToSourceArtboard(imglayer, layer);

            if (imglayer.type == layerType.SHAPEPATH) {
              imglayer.style.fills = [
                {
                  pattern: {
                    patternType: Style.PatternFillType.Fit,
                    image: newImg.image,
                  },
                  fillType: Style.FillType.pattern,
                },
              ];
              shapeCounter++;
            }

            if (imglayer.type == layerType.SYMBOLINSTANCE) {
              imglayer.overrides.forEach((override) => {
                if (override.property == overrideProperty.IMAGE) {
                  imglayer.setOverrideValue(override, newImg.image);
                }
              });
              symbolCounter++;
            }
          }
        });

        UI.message(
          `✅ ${shapeCounter} layer(s) & ${symbolCounter} symbol(s) updated at scale of ${Settings.settingForKey(
            "image-scales"
          )}`
        );
      }
    });
  }
}
