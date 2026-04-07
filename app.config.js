/**
 * Expo config — dev (`expo start --tunnel`) and EAS. Web is disabled; only iOS + Android (Expo Go / dev builds).
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
    platforms: ['ios', 'android'],
  },
});
