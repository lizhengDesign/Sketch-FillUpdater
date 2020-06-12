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
    IS_FLOW_ON: "isFlowOn",
    IS_COPY_ON: "isCopyOn",
    IS_CURRENT_PAGE_ONLY: "isCurrentPageOnly",
}
const imageScaleOptions = ["1", "2", "3"]
const sizeSyncOptions = ["Sync width & height", "Keep width & sync aspect ratio", "Do not update size"]
const defaultSettings = {
    imageScale: imageScaleOptions[0],
    sizeSyncType: 0,
    isFlowOn: false,
    isCopyOn: false,
    isCurrentPageOnly: false,
}
const panelSpec = {
    width: 300,
    height: 240,
    lineHeight: 25,
}
let UIComponentRect = (y) => NSMakeRect(0, panelSpec.height - y, panelSpec.width, panelSpec.lineHeight)
let imageScaleDropdown, sizeSyncDropdown, flowCreationToggle, currentPageOnlyToggle, copyBlockToggle

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
    // Image scale dropdown
    let imageScaleLabel = createLabel(30, "Image scale:")
    imageScaleDropdown = createDropdown(50, imageScaleOptions, Settings.settingForKey(prefernceKey.IMAGE_SCALE))

    // -----------------------------------
    // Size sync dropdown
    let sizeSyncLabel = createLabel(100, "Target layer size:")
    sizeSyncDropdown = createDropdown(
        120,
        sizeSyncOptions,
        sizeSyncOptions[Settings.settingForKey(prefernceKey.SIZE_SYNC_TYPE)]
    )

    // -----------------------------------
    // Link creation and copy block toggles
    let toggleLabel = createLabel(170, "Other settings:")
    flowCreationToggle = createToggle(190, prefernceKey.IS_FLOW_ON, "Create links (Can be used to navigate in Zeplin)")
    currentPageOnlyToggle = createToggle(
        210,
        prefernceKey.IS_CURRENT_PAGE_ONLY,
        "Only update images in the current selected page"
    )
    copyBlockToggle = createToggle(230, prefernceKey.IS_COPY_ON, "List editable text underneath the synced layers")

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
    Settings.setSettingForKey(prefernceKey.IMAGE_SCALE, defaultSettings.imageScale)
    Settings.setSettingForKey(prefernceKey.SIZE_SYNC_TYPE, defaultSettings.sizeSyncType)
    Settings.setSettingForKey(prefernceKey.IS_FLOW_ON, defaultSettings.isFlowOn)
    Settings.setSettingForKey(prefernceKey.IS_CURRENT_PAGE_ONLY, defaultSettings.isCurrentPageOnly)
    Settings.setSettingForKey(prefernceKey.IS_COPY_ON, defaultSettings.isCopyOn)

    UI.message(`✅ Successfully updated`)
}

export const updateSettings = () => {
    const imageScale = imageScaleOptions[imageScaleDropdown.indexOfSelectedItem()]
    const sizeSyncTypeIndex = sizeSyncDropdown.indexOfSelectedItem()

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
