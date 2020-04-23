let sketch = require("sketch");
let Settings = sketch.Settings;
let UI = sketch.UI;

export default function () {
  UI.getInputFromUser(
    "Update filler image scale",
    {
      type: UI.INPUT_TYPE.selection,
      initialValue: Settings.settingForKey("image-scales"),
      possibleValues: ["1", "2", "3"],
    },
    (err, value) => {
      Settings.setSettingForKey("image-scales", value);
      let imageScales = Settings.settingForKey("image-scales");
      UI.message(`✅ Image Scale is updated to ${imageScales}`);
      if (err) {
        // most likely the user canceled the input
        return;
      }
    }
  );
}
