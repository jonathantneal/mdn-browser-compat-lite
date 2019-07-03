const { pipeExec, fsWriteFile } = require('./lib/util');
const { resolve } = require('path');

(async () => {
	await pipeExec('npm install --no-save mdn-browser-compat-data@latest');

	const mdnBrowserCompatData = require('mdn-browser-compat-data');

	const mdnBrowserCompatLite = Object.create(null);
	const forEachSection = getForEachSection(mdnBrowserCompatLite);
	const essentialMdnKeys = getEssentialMdnKeys(mdnBrowserCompatData);

	essentialMdnKeys.forEach(sectionId => {
		const importedSection = mdnBrowserCompatData[sectionId];

		sectionId = getFormattedSectionId(sectionId);

		forEachSection(importedSection, [sectionId]);
	});

	const mdnBrowserCompatFile = 'index.json';
	const mdnBrowserCompatJSON = JSON.stringify(mdnBrowserCompatLite);

	await fsWriteFile(mdnBrowserCompatFile, mdnBrowserCompatJSON);

	const mdnBrowserCompatDataPkgData = require('mdn-browser-compat-data/package.json');
	const mdnBrowserCompatDataVersionNumbers = mdnBrowserCompatDataPkgData.version.split(/\./);
	const mdnBrowserCompatLitePkgFile = resolve('./package.json');
	const mdnBrowserCompatLitePkgData = require(mdnBrowserCompatLitePkgFile);
	const mdnBrowserCompatLiteVersionNumbers = mdnBrowserCompatLitePkgData['internal-version'].split(/\./).map(
		(number, index) => {
			const liteNumber = Number(number) || 0;
			const dataNumber = Number(mdnBrowserCompatDataVersionNumbers[index]) || 0;

			return String(liteNumber + dataNumber);
		}
	);

	mdnBrowserCompatLitePkgData.version = mdnBrowserCompatLiteVersionNumbers.join('.');

	const mdnBrowserCompatLitePkgJson = `${JSON.stringify(mdnBrowserCompatLitePkgData, null, '  ')}\n`;

	await fsWriteFile(mdnBrowserCompatLitePkgFile, mdnBrowserCompatLitePkgJson);
})();

function getEssentialMdnKeys (mdnBrowserCompatData) {
	const matchNonessentialMdnKeys = /^(browsers|http|webdriver|webextensions|xpath|xslt)$/;
	const isEssentialMdnKey = key => !matchNonessentialMdnKeys.test(key);
	const essentialMdnKeys = Object.keys(mdnBrowserCompatData).filter(isEssentialMdnKey).sort();

	return essentialMdnKeys;
}

function getForEachSection (exportedFeatures) {
	return function forEachSection (importedSection, sectionIds) {
		Object.keys(importedSection).sort().forEach(
			featureId => {
				const importedFeature = importedSection[featureId];
				const featureNames = sectionIds.concat(featureId);

				const isFeatureAnObject = importedFeature === Object(importedFeature);

				if (isFeatureAnObject) {
					const doesFeatureHaveSupportData = '__compat' in importedFeature;

					if (doesFeatureHaveSupportData) {
						const featureName = featureNames.join('.');
						const support = getSupportFromCompat(importedFeature.__compat);

						exportedFeatures[featureName] = support;
					}

					forEachSection(importedFeature, featureNames);
				}
			}
		);
	}
}

function getFormattedSectionId (sectionId) {
	const formattedSectionIds = {
		javascript: 'js'
	};

	return formattedSectionIds[sectionId] || sectionId
}

function getSupportFromCompat (compat) {
	const { support } = compat;
	const isSupportAnObject = support === Object(support);
	const supportKeys = isSupportAnObject ? Object.keys(support) : [];

	if (!supportKeys.length) {
		return null;
	}

	return supportKeys.sort().reduce(
		(browsers, browserId) => {
			const { version_added, version_removed } = support[browserId];

			const isFeatureMoreRecentlyRemoved = !version_added || version_removed > version_added;

			if (isFeatureMoreRecentlyRemoved) {
				return browsers;
			}

			browserId = formatBrowserId(browserId);

			if (browserId) {
				const version = formatBrowserVersion(version_added);

				browsers[browserId] = version;
			}

			return browsers;
		},
		{}
	);
}

function formatBrowserId (browserId) {
	const supportedBrowsers = {
		and_chr: 'and_chr',
		and_ff: 'and_ff',
		and_qq: 'and_qq',
		and_uc: 'and_uc',
		android: 'android',
		baidu: 'baidu',
		bb: 'bb',
		chrome: 'chrome',
		edge: 'edge',
		edge_mob: 'edge_mob',
		ff: 'ff',
		ie: 'ie',
		ie_mob: 'ie_mob',
		ios: 'ios',
		kaios: 'kaios',
		node: 'node',
		op_mini: 'op_mini',
		op_mob: 'op_mob',
		opera: 'opera',
		safari: 'safari',
		samsung: 'samsung',
	};

	const remappableBrowsers = {
		blackberry: 'bb',
		chrome_android: 'and_chr',
		chromeandroid: 'and_chr',
		edge_mobile: 'edge_mob',
		explorer: 'ie',
		explorermobile: 'ie_mob',
		firefox_android: 'and_ff',
		firefoxandroid: 'and_ff',
		firefox: 'ff',
		ios_saf: 'ios',
		nodejs: 'node',
		opera_android: 'and_chr',
		operamini: 'op_mini',
		operamobile: 'op_mob',
		qq_android: 'and_qq',
		qqandroid: 'and_qq',
		safari_ios: 'ios_saf',
		samsunginternet_android: 'samsung',
		uc_android: 'and_uc',
		uc_chinese_android: 'and_uc',
		ucandroid: 'and_uc',
		webview_android: 'android',
	};

	const browserMap = Object.assign(
		Object.create(null),
		supportedBrowsers,
		remappableBrowsers
	);

	browserId = String(browserId).toLowerCase();

	if (browserId in browserMap) {
		browserId = browserMap[browserId];

		return browserId;
	}
}

function formatBrowserVersion (browserVersion) {
	browserVersion = browserVersion === true ? 0 : typeof browserVersion === 'string' ? browserVersion.replace(/-.*$/, '') : browserVersion;

	return isNaN(browserVersion)
		? browserVersion === 'all'
			? 0
		: browserVersion
	: Number(browserVersion)
}
