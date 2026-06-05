/**
 * Pure builders that return the inline JS / markup string for each analytics
 * provider. User-supplied IDs are interpolated with JSON.stringify so they can
 * never break out of the surrounding JS string literal. These are the official
 * vendor snippets (array-stub loaders) — keep them in sync with vendor docs.
 */

const q = (v) => JSON.stringify(String(v ?? ""));

export const gaInit = (id) =>
  `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}` +
  `gtag('js',new Date());gtag('config',${q(id)});`;

export const gtmInit = (id) =>
  `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});` +
  `var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;` +
  `j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);` +
  `})(window,document,'script','dataLayer',${q(id)});`;

export const gtmNoscriptSrc = (id) =>
  `https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(id)}`;

export const posthogInit = (apiKey, apiHost) =>
  `!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");` +
  `2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}` +
  `(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,` +
  `p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",` +
  `(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;` +
  `for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";` +
  `return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},` +
  `o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug getPageViewId".split(" "),n=0;n<o.length;n++)g(u,o[n]);` +
  `e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);` +
  `posthog.init(${q(apiKey)},{api_host:${q(apiHost || "https://us.i.posthog.com")}});`;

export const metaPixelInit = (id) =>
  `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?` +
  `n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;` +
  `n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;` +
  `t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}` +
  `(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');` +
  `fbq('init',${q(id)});fbq('track','PageView');`;

export const metaPixelNoscriptSrc = (id) =>
  `https://www.facebook.com/tr?id=${encodeURIComponent(id)}&ev=PageView&noscript=1`;

export const hotjarInit = (siteId) => {
  const hjid = Number(siteId) || q(siteId);
  return (
    `(function(h,o,t,j,a,r){h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};` +
    `h._hjSettings={hjid:${hjid},hjsv:6};a=o.getElementsByTagName('head')[0];` +
    `r=o.createElement('script');r.async=1;r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;` +
    `a.appendChild(r)})(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');`
  );
};

export const linkedinInit = (partnerId) =>
  `_linkedin_partner_id=${q(partnerId)};window._linkedin_data_partner_ids=window._linkedin_data_partner_ids||[];` +
  `window._linkedin_data_partner_ids.push(_linkedin_partner_id);(function(l){if(!l){window.lintrk=function(a,b){` +
  `window.lintrk.q.push([a,b])};window.lintrk.q=[]}var s=document.getElementsByTagName("script")[0];` +
  `var b=document.createElement("script");b.type="text/javascript";b.async=true;` +
  `b.src="https://snap.licdn.com/li.lms-analytics/insight.min.js";s.parentNode.insertBefore(b,s);})(window.lintrk);`;

export const linkedinNoscriptSrc = (partnerId) =>
  `https://px.ads.linkedin.com/collect/?pid=${encodeURIComponent(partnerId)}&fmt=gif`;
