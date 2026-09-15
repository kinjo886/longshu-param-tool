// 点击扩展图标，直接打开侧边栏（和当前页面并排，无需手动分屏）
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ windowId: tab.windowId });
});