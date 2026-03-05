export const initialUiState = {
  phase: "idle",
  downloadProgress: 0,
  outputText: "",
  errorMessage: ""
};

export function uiStateReducer(state, action) {
  switch (action.type) {
    case "download-start":
      return {
        ...state,
        phase: "downloading",
        downloadProgress: 0,
        errorMessage: ""
      };
    case "download-progress": {
      const progress = Math.max(0, Math.min(1, Number(action.progress) || 0));
      return {
        ...state,
        downloadProgress: progress,
        phase: progress >= 1 ? "ready" : "downloading"
      };
    }
    case "translate-start":
      return {
        ...state,
        phase: "translating",
        errorMessage: ""
      };
    case "translate-success":
      return {
        ...state,
        phase: "done",
        outputText: action.output ?? "",
        errorMessage: ""
      };
    case "translate-error":
      return {
        ...state,
        phase: "error",
        errorMessage: action.message ?? "Unknown error"
      };
    case "clear":
      return {
        ...initialUiState
      };
    default:
      return state;
  }
}
