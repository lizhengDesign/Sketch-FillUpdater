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
const sizeSyncType = {
  SYNC_BOTH: 0,
  SYNC_WIDTH: 1,
  SYNC_NEITHER: 2,
};
const preferences = {
  EXPORT_OPTIONS: {
    scales:
      Settings.settingForKey("imageScales") == undefined
        ? "1"
        : Settings.settingForKey("imageScales"),
    formats: "png",
    output: false,
  },
  IS_FLOW_ON:
    Settings.settingForKey("isFlowOn") == undefined
      ? false
      : Settings.settingForKey("isFlowOn"),
  SIZE_SYNC_TYPE:
    Settings.settingForKey("sizeSyncType") == undefined
      ? sizeSyncType.SYNC_BOTH
      : Settings.settingForKey("sizeSyncType"),
};
let shapeCounter = 0;
let symbolCounter = 0;

function updateLayerSize(targetLayer, sourceArtboard, ratio) {
  switch (preferences.SIZE_SYNC_TYPE) {
    case sizeSyncType.SYNC_BOTH:
      targetLayer.frame.width = sourceArtboard.frame.width;
      targetLayer.frame.height = sourceArtboard.frame.height;
      break;
    case sizeSyncType.SYNC_WIDTH:
      targetLayer.frame.height = targetLayer.frame.width / ratio;
      break;
    case sizeSyncType.SYNC_NEITHER:
      break;
    default:
  }
}

function updateFlowToSourceArtboard(targetLayer, sourceArtboard) {
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
        const ratio = layer.frame.width / layer.frame.height;

        targetLayers.forEach((imglayer) => {
          if (id != imglayer.id && imglayer.type != layerType.ARTBOARD) {
            updateLayerSize(imglayer, layer, ratio);
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
          `✅ ${shapeCounter} layer(s) & ${symbolCounter} symbol(s) updated at scale of ${preferences.EXPORT_OPTIONS.scales}`
        );
      }
    });
  }
}
