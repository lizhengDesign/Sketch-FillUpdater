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
let exportOptions = {
  scales: Settings.settingForKey("image-scales"),
  formats: "png",
  output: false,
};

let shapeCounter = 0;
let symbolCounter = 0;

export default function () {
  if (selectedLayers.length < 1) {
    // -----------------------------------
    // Display a message when no layers are selected
    UI.message("❌ Please select 1 artboard.");
  } else {
    selectedLayers.forEach((layer) => {
      if (layer.type != layerType.ARTBOARD) {
        // -----------------------------------
        // Display a message when layers with other types are selected
        UI.message("❌ Only content in artboards will be used for updating.");
      } else {
        const id = layer.id;
        const buffer = sketch.export(layer, exportOptions);
        const newImg = sketch.createLayerFromData(buffer, "bitmap");
        const targetLayers = doc.getLayersNamed(layer.name);

        targetLayers.forEach((imglayer) => {
          if (id != imglayer.id && imglayer.type != layerType.ARTBOARD) {
            imglayer.frame.width = layer.frame.width;
            imglayer.frame.height = layer.frame.height;

            if (imglayer.type == layerType.SHAPEPATH) {
              imglayer.style.fills = [
                {
                  pattern: {
                    patternType: Style.PatternFillType.Fill,
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
          `✅ ${shapeCounter} layer(s) & ${symbolCounter} symbol(s) updated.`
        );
      }
    });
  }
}
