export function isSidePanelUserGestureError(error) {
  const message = String(error?.message || "");
  return (
    message.includes("sidePanel.open()") &&
    message.toLowerCase().includes("user gesture")
  );
}

export async function tryOpenSidePanel(windowId) {
  if (!windowId || !chrome.sidePanel?.open) {
    return false;
  }

  try {
    await chrome.sidePanel.open({ windowId });
    return true;
  } catch (error) {
    if (isSidePanelUserGestureError(error)) {
      return false;
    }
    throw error;
  }
}
