let sketch = require("sketch");
let Style = sketch.Style;
let Settings = sketch.Settings;
let UI = sketch.UI;

const doc = sketch.getSelectedDocument();
const selectedLayers = doc.selectedLayers;
const layerType = {
  ARTBOARD: "Artboard",
  SHAPEPATH: "ShapePath",
  TEXT: "Text",
  SYMBOLINSTANCE: "SymbolInstance",
};
const overrideProperty = {
  IMAGE: "image",
  TEXT: "stringValue",
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
  SIZE_SYNC_TYPE:
    Settings.settingForKey("sizeSyncType") == undefined
      ? sizeSyncType.SYNC_BOTH
      : Settings.settingForKey("sizeSyncType"),
  IS_FLOW_ON:
    Settings.settingForKey("isFlowOn") == undefined
      ? false
      : Settings.settingForKey("isFlowOn"),
  IS_COPY_ON:
    Settings.settingForKey("isCopyOn") == undefined
      ? false
      : Settings.settingForKey("isCopyOn"),
};
const copyBlockSpec = {
  secondaryMargin: 4,
  primaryMargin: 24,
  keyStyle: {
    textColor: "#00000099",
    fontSize: 14,
    lineHeight: 16,
    fontWeight: 4,
    alignment: sketch.Text.Alignment.left,
  },
  valueStyle: {
    textColor: "#000000EE",
    fontSize: 16,
    lineHeight: 20,
    fontWeight: 8,
    alignment: sketch.Text.Alignment.left,
  },
  headerStyle: {
    textColor: "#000000EE",
    fontSize: 16,
    lineHeight: 20,
    fontWeight: 8,
    textTransform: "uppercase",
    alignment: sketch.Text.Alignment.left,
  },
  copyPrefix: "[Copy]: ",
  imgCopyPrefix: "[Img + Copy]: ",
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

function removeChildrenLayersNotNamed(parent, name) {
  parent.layers.forEach((sublayer) => {
    if (sublayer.name != name) sublayer.remove();
  });
  parent.adjustToFit();
}

function createCopyKeyValueGroup(
  targetLayer,
  sourceKey,
  sourceValue,
  copyBlockGroup
) {
  let key = new sketch.Text({
    text: sourceKey,
    parent: copyBlockGroup,
    fixedWidth: true,
    style: copyBlockSpec.keyStyle,
    frame: {
      x: 0,
      y: copyBlockGroup.frame.height + copyBlockSpec.primaryMargin,
      width: targetLayer.frame.width,
      height: 0,
    },
  }).adjustToFit();
  let value = new sketch.Text({
    text: sourceValue,
    parent: copyBlockGroup,
    fixedWidth: true,
    style: copyBlockSpec.valueStyle,
    frame: {
      x: 0,
      y: key.frame.y + key.frame.height + copyBlockSpec.secondaryMargin,
      width: targetLayer.frame.width,
      height: 0,
    },
  }).adjustToFit();
  new sketch.Group({
    name: "Copy: " + sourceKey,
    parent: copyBlockGroup,
    layers: [key, value],
  }).adjustToFit();
}

function updateCopyBlock(targetLayer, sourceArtboard) {
  const imgCopyGroupName = copyBlockSpec.imgCopyPrefix + targetLayer.name;
  let imgCopyGroup = targetLayer.parent;

  if (preferences.IS_COPY_ON) {
    function createCopyBlock(layer) {
      if (layer.layers == undefined) {
        switch (layer.type) {
          case layerType.TEXT:
            createCopyKeyValueGroup(
              targetLayer,
              layer.name,
              layer.text,
              copyBlockGroup
            );
            break;
          case layerType.SYMBOLINSTANCE:
            const symbolDoc =
              layer.master.getLibrary() == null
                ? doc
                : layer.master.getLibrary().getDocument();

            layer.overrides.forEach((override) => {
              if (
                override.property == overrideProperty.TEXT &&
                override.editable
              ) {
                const path = override.path.split("/");
                let name = "";
                path.forEach((id) => {
                  if (symbolDoc.getLayerWithID(id) == undefined) return;
                  name += symbolDoc.getLayerWithID(id).name + " - ";
                });
                name = name.substr(0, name.length - 3);
                createCopyKeyValueGroup(
                  targetLayer,
                  name,
                  override.value,
                  copyBlockGroup
                );
              }
            });
            break;
          default:
        }
        return;
      } else {
        layer.layers.forEach((sublayer) => {
          createCopyBlock(sublayer);
        });
      }
    }

    if (imgCopyGroup.name != imgCopyGroupName) {
      imgCopyGroup = new sketch.Group({
        name: imgCopyGroupName,
        parent: targetLayer.parent,
        layers: [targetLayer],
      }).adjustToFit();
    }
    removeChildrenLayersNotNamed(imgCopyGroup, targetLayer.name);
    let copyBlockGroup = new sketch.Group({
      name: copyBlockSpec.copyPrefix + targetLayer.name,
      parent: imgCopyGroup,
      frame: { x: 0, y: targetLayer.frame.height, width: 0, height: 0 },
    });
    new sketch.Text({
      text: "Editable text",
      style: copyBlockSpec.headerStyle,
      parent: copyBlockGroup,
      frame: {
        x: 0,
        y: copyBlockSpec.primaryMargin * 2,
        width: targetLayer.frame.width,
        height: 0,
      },
    }).adjustToFit();
    copyBlockGroup.adjustToFit();

    createCopyBlock(sourceArtboard);

    copyBlockGroup.adjustToFit();
    imgCopyGroup.adjustToFit();
  } else if (imgCopyGroup.name == imgCopyGroupName) {
    removeChildrenLayersNotNamed(imgCopyGroup, targetLayer.name);
    targetLayer.parent = imgCopyGroup.parent;
    targetLayer.frame = imgCopyGroup.frame;
    imgCopyGroup.remove();
  }
}

export function syncSameNameLayers() {
  if (selectedLayers.length === 0) {
    UI.message("❌ Please select at least 1 artboard.");
  } else {
    selectedLayers.forEach((sourceLayer) => {
      if (sourceLayer.type != layerType.ARTBOARD) {
        UI.message("❌ Only content in artboards will be used for updating.");
      } else {
        const id = sourceLayer.id;
        const buffer = sketch.export(sourceLayer, preferences.EXPORT_OPTIONS);
        const newImg = sketch.createLayerFromData(buffer, "bitmap");
        const targetLayers = doc.getLayersNamed(sourceLayer.name);
        const ratio = sourceLayer.frame.width / sourceLayer.frame.height;

        targetLayers.forEach((imglayer) => {
          if (id != imglayer.id && imglayer.type != layerType.ARTBOARD) {
            updateLayerSize(imglayer, sourceLayer, ratio);
            updateFlowToSourceArtboard(imglayer, sourceLayer);
            updateCopyBlock(imglayer, sourceLayer);

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
