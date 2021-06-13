import dialog from "@skpm/dialog"
const sketch = require("sketch")
const Style = sketch.Style
const Settings = sketch.Settings
const UI = sketch.UI
const doc = sketch.getSelectedDocument()
const selectedLayers = doc.selectedLayers
const layerType = {
    ARTBOARD: "Artboard",
    SHAPEPATH: "ShapePath",
    TEXT: "Text",
    SYMBOLINSTANCE: "SymbolInstance",
    SYMBOLMASTER: "SymbolMaster",
}
const overrideProperty = {
    IMAGE: "image",
    TEXT: "stringValue",
}
const sizeSyncType = {
    SYNC_BOTH: 0,
    SYNC_WIDTH: 1,
    SYNC_NEITHER: 2,
}
const preferences = {
    EXPORT_OPTIONS: {
        scales: Settings.settingForKey("imageScales") === undefined ? "1" : Settings.settingForKey("imageScales"),
        formats: "png",
        output: false,
    },
    SIZE_SYNC_TYPE:
        Settings.settingForKey("sizeSyncType") === undefined
            ? sizeSyncType.SYNC_BOTH
            : Settings.settingForKey("sizeSyncType"),
    IS_FLOW_ON: Settings.settingForKey("isFlowOn") === undefined ? false : Settings.settingForKey("isFlowOn"),
    IS_UPDATE_BY_FLOW: Settings.settingForKey("updateType") === 1,
    IS_CURRENT_PAGE_ONLY:
        Settings.settingForKey("isCurrentPageOnly") === undefined ? false : Settings.settingForKey("isCurrentPageOnly"),
    IS_COPY_ON: Settings.settingForKey("isCopyOn") === undefined ? false : Settings.settingForKey("isCopyOn"),
}
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
}
let shapeCounter = 0
let symbolCounter = 0

const updateLayerSize = (targetLayer, sourceArtboard, ratio) => {
    switch (preferences.SIZE_SYNC_TYPE) {
        case sizeSyncType.SYNC_BOTH:
            targetLayer.frame.width = sourceArtboard.frame.width
            targetLayer.frame.height = sourceArtboard.frame.height
            break
        case sizeSyncType.SYNC_WIDTH:
            targetLayer.frame.height = targetLayer.frame.width / ratio
            break
        case sizeSyncType.SYNC_NEITHER:
            break
    }
}

const updateFlowToSourceArtboard = (targetLayer, sourceArtboard) => {
    if (preferences.IS_FLOW_ON) {
        targetLayer.flow = { target: sourceArtboard }
    } else {
        targetLayer.flow = undefined
    }
}

const removeChildrenLayersNotNamed = (parent, name) => {
    parent.layers.forEach((sublayer) => {
        if (sublayer.name !== name) sublayer.remove()
    })
    parent.adjustToFit()
}

const createCopyKeyValueGroup = (targetLayer, sourceKey, sourceValue, copyBlockGroup) => {
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
    }).adjustToFit()
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
    }).adjustToFit()
    new sketch.Group({
        name: "Copy: " + sourceKey,
        parent: copyBlockGroup,
        layers: [key, value],
    }).adjustToFit()
}

const updateCopyBlock = (targetLayer, sourceArtboard) => {
    const imgCopyGroupName = copyBlockSpec.imgCopyPrefix + targetLayer.name
    let imgCopyGroup = targetLayer.parent

    if (preferences.IS_COPY_ON) {
        const createCopyBlock = (layer) => {
            if (layer.layers === undefined) {
                switch (layer.type) {
                    case layerType.TEXT:
                        createCopyKeyValueGroup(targetLayer, layer.name, layer.text, copyBlockGroup)
                        break
                    case layerType.SYMBOLINSTANCE:
                        layer.overrides.forEach((override) => {
                            if (override.property === overrideProperty.TEXT && override.editable) {
                                createCopyKeyValueGroup(
                                    targetLayer,
                                    layer.name + ": " + override.affectedLayer.name,
                                    override.value,
                                    copyBlockGroup
                                )
                            }
                        })
                        break
                }
                return
            } else {
                layer.layers.forEach((sublayer) => {
                    createCopyBlock(sublayer)
                })
            }
        }

        if (imgCopyGroup.name !== imgCopyGroupName) {
            imgCopyGroup = new sketch.Group({
                name: imgCopyGroupName,
                parent: targetLayer.parent,
                layers: [targetLayer],
            }).adjustToFit()
        }
        removeChildrenLayersNotNamed(imgCopyGroup, targetLayer.name)
        let copyBlockGroup = new sketch.Group({
            name: copyBlockSpec.copyPrefix + targetLayer.name,
            parent: imgCopyGroup,
            frame: { x: 0, y: targetLayer.frame.height, width: 0, height: 0 },
        })
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
        }).adjustToFit()
        copyBlockGroup.adjustToFit()

        createCopyBlock(sourceArtboard)

        copyBlockGroup.adjustToFit()
        imgCopyGroup.adjustToFit()
    } else if (imgCopyGroup.name === imgCopyGroupName) {
        removeChildrenLayersNotNamed(imgCopyGroup, targetLayer.name)
        targetLayer.parent = imgCopyGroup.parent
        targetLayer.frame = imgCopyGroup.frame
        imgCopyGroup.remove()
    }
}

const syncArtboardContent = (sourceArtboard, selectedLayer) => {
    const id = sourceArtboard.id
    const buffer = sketch.export(sourceArtboard, preferences.EXPORT_OPTIONS)
    const newImg = sketch.createLayerFromData(buffer, "bitmap")
    const targetLayers = sourceArtboard === selectedLayer ? doc.getLayersNamed(sourceArtboard.name) : [selectedLayer]
    const ratio = sourceArtboard.frame.width / sourceArtboard.frame.height

    targetLayers.forEach((imglayer) => {
        const canUpdate = preferences.IS_CURRENT_PAGE_ONLY ? imglayer.getParentPage().selected : true
        if (canUpdate && id !== imglayer.id && imglayer.type !== layerType.ARTBOARD) {
            updateLayerSize(imglayer, sourceArtboard, ratio)
            updateFlowToSourceArtboard(imglayer, sourceArtboard)
            updateCopyBlock(imglayer, sourceArtboard)

            if (imglayer.type === layerType.SHAPEPATH) {
                imglayer.style.fills = [
                    {
                        pattern: {
                            patternType: Style.PatternFillType.Fit,
                            image: newImg.image,
                        },
                        fillType: Style.FillType.pattern,
                    },
                ]
                shapeCounter++
            } else if (imglayer.type === layerType.SYMBOLINSTANCE) {
                imglayer.overrides.forEach((override) => {
                    if (override.property === overrideProperty.IMAGE) {
                        imglayer.setOverrideValue(override, newImg.image)
                    }
                })
                symbolCounter++
            }
        }
    })
}

const getOriginalData = (selectedLayer) => {
    const locatedArtboard = selectedLayer.getParentArtboard()
    if (!locatedArtboard) return undefined

    const originalFlow = selectedLayer.flow
    const originalContent =
        selectedLayer.type === layerType.SHAPEPATH ? selectedLayer.style.fills : selectedLayer.overrides
    const originalName = locatedArtboard ? locatedArtboard.name : undefined
    const matchName = selectedLayer.name.substring(
        0,
        selectedLayer.name.indexOf("@") < 0 ? selectedLayer.name.length - 1 : selectedLayer.name.indexOf("@")
    )
    const variationName = matchName.trim().replace(/: */g, "_")

    return {
        locatedArtboard: locatedArtboard,
        flow: originalFlow,
        content: originalContent,
        artboardName: originalName,
        variationName: variationName,
        matchName: matchName,
    }
}

const retainOriginalData = (selectedLayer, originalData) => {
    originalData.locatedArtboard.name = originalData.artboardName
    selectedLayer.flow = originalData.flow
    if (selectedLayer.type === layerType.SHAPEPATH) {
        selectedLayer.style.fills = originalData.content
    } else {
        selectedLayer.overrides.forEach((override, index) => (override = originalData.content[index]))
    }
}

export const exportLayers = () => {
    if (selectedLayers.length === 0) {
        UI.message("❌ Please select at least 1 layer.")
        return
    }

    const filePath = dialog.showSaveDialogSync(doc)

    if (filePath) {
        UI.getInputFromUser(
            "What's the image scale do you want to export?",
            {
                initialValue: "1",
                type: UI.INPUT_TYPE.selection,
                possibleValues: ["1", "2", "3"],
                description: "Depends on the amount of variations, it may take a few seconds...",
            },
            (err, value) => {
                if (err) return

                preferences.IS_UPDATE_BY_FLOW = false

                const outputOptions = {
                    formats: "png",
                    scales: value,
                    output: filePath,
                }

                const locatedArtboard = selectedLayers.layers[0].getParentArtboard()
                if (!locatedArtboard) return

                const scope = preferences.IS_CURRENT_PAGE_ONLY ? locatedArtboard.getParentPage() : doc

                const isSelectedLayersASetAndInOneArtboard = selectedLayers.reduce(
                    (prev, curr) =>
                        prev &&
                        curr.name.includes("@") &&
                        curr.getParentArtboard() &&
                        curr.getParentArtboard().id === locatedArtboard.id,
                    true
                )

                if (isSelectedLayersASetAndInOneArtboard) {
                    let index = 0
                    let isSetExisted = true

                    const originalDataSet = selectedLayers.map((selectedLayer) => getOriginalData(selectedLayer))

                    while (isSetExisted) {
                        index++
                        const sourceArtboards = []
                        selectedLayers.forEach((selectedLayer, i) => {
                            if (!isSetExisted) return
                            const layerList = sketch.find(
                                `Artboard,[name="${originalDataSet[i].matchName}${index}"]`,
                                scope
                            )
                            if (layerList.length > 0) {
                                sourceArtboards.push(layerList[0])
                            } else isSetExisted = false
                        })
                        if (isSetExisted) {
                            locatedArtboard.name =
                                originalDataSet[0].artboardName.replace(/: */g, "_") +
                                "/" +
                                originalDataSet.map((data) => data.variationName).join("-") +
                                "-" +
                                index
                            selectedLayers.forEach((selectedLayer, i) =>
                                syncArtboardContent(sourceArtboards[i], selectedLayer)
                            )
                            sketch.export(locatedArtboard, outputOptions)
                        }
                    }

                    selectedLayers.forEach((selectedLayer, i) => retainOriginalData(selectedLayer, originalDataSet[i]))
                } else {
                    selectedLayers.forEach((selectedLayer) => {
                        if (
                            selectedLayer.type === layerType.SHAPEPATH ||
                            selectedLayer.type === layerType.SYMBOLINSTANCE
                        ) {
                            const originalData = getOriginalData(selectedLayer)
                            if (!originalData) return

                            const sourceArtboards = sketch.find(`Artboard,[name="${selectedLayer.name}"]`, scope)
                            sourceArtboards.forEach((sourceArtboard, index) => {
                                originalData.locatedArtboard.name =
                                    originalData.artboardName + "/" + originalData.variationName + "-" + index
                                sourceArtboard.selected = true
                                syncArtboardContent(sourceArtboard, selectedLayer)
                                sketch.export(originalData.locatedArtboard, outputOptions)
                            })

                            retainOriginalData(selectedLayer, originalData)
                        }
                    })
                }

                UI.message(
                    `✅ ${shapeCounter} layer(s) & ${symbolCounter} symbol(s) updated at scale of ${preferences.EXPORT_OPTIONS.scales}`
                )
            }
        )
    }
}

export const syncLayers = () => {
    if (selectedLayers.length === 0) {
        UI.message("❌ Please select at least 1 artboard or layer.")
        return
    }

    selectedLayers.forEach((selectedLayer) => {
        let sourceLayer = selectedLayer

        if (selectedLayer.type !== layerType.ARTBOARD) {
            UI.message("Only content in artboards will be used for updating.")
            const sourceLayers = preferences.IS_UPDATE_BY_FLOW
                ? selectedLayer.flow
                    ? [selectedLayer.flow.target]
                    : []
                : doc.getLayersNamed(selectedLayer.name)
            for (let i = 0; i < sourceLayers.length; i++) {
                if (sourceLayers[i].type === layerType.ARTBOARD) {
                    sourceLayer = sourceLayers[i]
                    break
                }
            }
        }

        if (sourceLayer.type === layerType.ARTBOARD) {
            syncArtboardContent(sourceLayer, selectedLayer)
        }
    })

    UI.message(
        `✅ ${shapeCounter} layer(s) & ${symbolCounter} symbol(s) updated at scale of ${preferences.EXPORT_OPTIONS.scales}`
    )
}
