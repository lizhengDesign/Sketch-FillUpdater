const sketch = require("sketch")
const Settings = sketch.Settings
const UI = sketch.UI
const responseOptions = {
    SAVE: 1000,
    RESET: 1001,
    CANCEL: 1002,
}
const prefernceKey = {
    IMAGE_SCALE: "imageScales",
    SIZE_SYNC_TYPE: "sizeSyncType",
    UPDATE_TYPE: "updateType",
    IS_FLOW_ON: "isFlowOn",
    IS_COPY_ON: "isCopyOn",
    IS_CURRENT_PAGE_ONLY: "isCurrentPageOnly",
}
const updateTypeOptions = ["Layer Name", "Prototpye Link"]
const imageScaleOptions = ["1", "2", "3"]
const sizeSyncOptions = ["Sync width & height", "Keep width & sync aspect ratio", "Do not update size"]

const defaultSettings = {
    updateType: updateTypeOptions[0],
    imageScale: imageScaleOptions[0],
    sizeSyncType: 0,
    isFlowOn: false,
    isCopyOn: false,
    isUpdateByFlow: false,
    isCurrentPageOnly: false,
}
const panelSpec = {
    width: 300,
    height: 310,
    lineHeight: 25,
}
let UIComponentRect = (y) => NSMakeRect(0, panelSpec.height - y, panelSpec.width, panelSpec.lineHeight)
let updateTypeDropdown, imageScaleDropdown, sizeSyncDropdown, flowCreationToggle, currentPageOnlyToggle, copyBlockToggle
let positionY = 30

const createLabel = (positionY, text) => {
    const label = NSTextField.alloc().initWithFrame(UIComponentRect(positionY))

    label.setStringValue(text)
    label.setSelectable(false)
    label.setEditable(false)
    label.setBezeled(false)
    label.setDrawsBackground(false)

    return label
}

const createToggle = (positionY, settingKey, text) => {
    const toggle = NSButton.alloc().initWithFrame(UIComponentRect(positionY))
    const initValue = Settings.settingForKey(settingKey) == 0 ? NSOffState : NSOnState

    toggle.setButtonType(NSSwitchButton)
    toggle.setBezelStyle(0)
    toggle.setTitle(text)
    toggle.setState(initValue)

    return toggle
}

const createDropdown = (positionY, possibleValue, initValue) => {
    const dropdowm = NSPopUpButton.alloc().initWithFrame(UIComponentRect(positionY))
    const initialIndex = possibleValue.indexOf(initValue)

    dropdowm.addItemsWithTitles(possibleValue)
    dropdowm.selectItemAtIndex(initialIndex !== -1 ? initialIndex : 0)

    return dropdowm
}

const newTitle = () => {
    positionY += 50
}
const newLine = () => {
    positionY += 20
}

export const createSettingPanel = () => {
    var panel = COSAlertWindow.new()
    panel.setIcon(__command.pluginBundle().alertIcon())
    panel.setMessageText("Fill Updater Settings")
    panel.addButtonWithTitle("Save")
    panel.addButtonWithTitle("Reset")
    panel.addButtonWithTitle("Cancel")
    const view = NSView.alloc().initWithFrame(NSMakeRect(0, 0, panelSpec.width, panelSpec.height))
    panel.addAccessoryView(view)

    // -----------------------------------
    // Update type dropdown
    let updateTypeLabel = createLabel(positionY, "Update layers according to:")
    newLine()
    updateTypeDropdown = createDropdown(
        positionY,
        updateTypeOptions,
        updateTypeOptions[Settings.settingForKey(prefernceKey.UPDATE_TYPE)]
    )

    // -----------------------------------
    // Image scale dropdown
    newTitle()
    let imageScaleLabel = createLabel(positionY, "Image scale:")
    newLine()
    imageScaleDropdown = createDropdown(positionY, imageScaleOptions, Settings.settingForKey(prefernceKey.IMAGE_SCALE))

    // -----------------------------------
    // Size sync dropdown
    newTitle()
    let sizeSyncLabel = createLabel(positionY, "Target layer size:")
    newLine()
    sizeSyncDropdown = createDropdown(
        positionY,
        sizeSyncOptions,
        sizeSyncOptions[Settings.settingForKey(prefernceKey.SIZE_SYNC_TYPE)]
    )

    // -----------------------------------
    // Link creation and copy block toggles
    newTitle()
    let toggleLabel = createLabel(positionY, "Other settings:")
    newLine()
    flowCreationToggle = createToggle(
        positionY,
        prefernceKey.IS_FLOW_ON,
        "Create links (Can be used to navigate in Zeplin)"
    )
    newLine()
    currentPageOnlyToggle = createToggle(
        positionY,
        prefernceKey.IS_CURRENT_PAGE_ONLY,
        "Only update fills in the current selected page"
    )
    newLine()
    copyBlockToggle = createToggle(
        positionY,
        prefernceKey.IS_COPY_ON,
        "List editable text underneath the synced layers"
    )

    view.addSubview(updateTypeLabel)
    view.addSubview(updateTypeDropdown)

    view.addSubview(imageScaleLabel)
    view.addSubview(imageScaleDropdown)

    view.addSubview(sizeSyncLabel)
    view.addSubview(sizeSyncDropdown)

    view.addSubview(toggleLabel)
    view.addSubview(flowCreationToggle)
    view.addSubview(currentPageOnlyToggle)
    view.addSubview(copyBlockToggle)

    return panel.runModal()
}

export const resetSettings = () => {
    Settings.setSettingForKey(prefernceKey.UPDATE_TYPE, defaultSettings.updateType)
    Settings.setSettingForKey(prefernceKey.IMAGE_SCALE, defaultSettings.imageScale)
    Settings.setSettingForKey(prefernceKey.SIZE_SYNC_TYPE, defaultSettings.sizeSyncType)
    Settings.setSettingForKey(prefernceKey.IS_FLOW_ON, defaultSettings.isFlowOn)
    Settings.setSettingForKey(prefernceKey.IS_CURRENT_PAGE_ONLY, defaultSettings.isCurrentPageOnly)
    Settings.setSettingForKey(prefernceKey.IS_COPY_ON, defaultSettings.isCopyOn)

    UI.message(`✅ Successfully updated`)
}

export const updateSettings = () => {
    const updateType = updateTypeDropdown.indexOfSelectedItem()
    const imageScale = imageScaleOptions[imageScaleDropdown.indexOfSelectedItem()]
    const sizeSyncTypeIndex = sizeSyncDropdown.indexOfSelectedItem()

    Settings.setSettingForKey(prefernceKey.UPDATE_TYPE, updateType)
    Settings.setSettingForKey(prefernceKey.IMAGE_SCALE, imageScale)
    Settings.setSettingForKey(prefernceKey.SIZE_SYNC_TYPE, sizeSyncTypeIndex)
    Settings.setSettingForKey(prefernceKey.IS_FLOW_ON, flowCreationToggle.state())
    Settings.setSettingForKey(prefernceKey.IS_CURRENT_PAGE_ONLY, currentPageOnlyToggle.state())
    Settings.setSettingForKey(prefernceKey.IS_COPY_ON, copyBlockToggle.state())

    UI.message(`✅ Successfully updated`)
}

export default () => {
    let response = createSettingPanel()
    switch (response) {
        case responseOptions.SAVE:
            updateSettings()
            break
        case responseOptions.RESET:
            resetSettings()
            break
        case responseOptions.CANCEL:
            break
    }
}
