/**
 * Expo config — used by EAS Build / Submit. Values here override `app.json` when present.
 * @see https://docs.expo.dev/workflow/configuration/
 */
const appJson = require('./app.json');

module.exports = () => ({
  expo: {
    ...appJson.expo,
    name: 'KeyGo',
    slug: 'keygo',
    version: appJson.expo.version ?? '1.0.0',
    orientation: 'portrait',
  },
});
