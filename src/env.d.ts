interface ElectronOpenDialogOptions {
  title?: string
  properties?: Array<'openFile' | 'openDirectory' | 'multiSelections' | 'showHiddenFiles' | 'createDirectory'>
  filters?: Array<{ name: string; extensions: string[] }>
}

interface ElectronSaveDialogOptions {
  title?: string
  defaultPath?: string
  filters?: Array<{ name: string; extensions: string[] }>
}

interface ElectronOpenDialogReturnValue {
  canceled: boolean
  filePaths: string[]
}

interface ElectronSaveDialogReturnValue {
  canceled: boolean
  filePath?: string
}

interface UpdateCheckResult {
  currentVersion: string
  latestVersion: string
  hasUpdate: boolean
  releaseUrl: string
  downloadUrl: string
  releaseName: string
}

interface QuestionApi {
  platform: NodeJS.Platform
  loadProjects: () => Promise<unknown>
  saveProjects: (projects: unknown) => Promise<{ ok: boolean }>
  getDataPath: () => Promise<string>
  getVersion: () => Promise<string>
  checkForUpdates: () => Promise<UpdateCheckResult>
  openExternal: (url: string) => Promise<boolean>
  minimizeWindow: () => Promise<void>
  toggleMaximizeWindow: () => Promise<void>
  closeWindow: () => Promise<void>
  showOpenDialog: (options: ElectronOpenDialogOptions) => Promise<ElectronOpenDialogReturnValue>
  showSaveDialog: (options: ElectronSaveDialogOptions) => Promise<ElectronSaveDialogReturnValue>
}

interface Window {
  questionApi?: QuestionApi
}

declare module '*.svg' {
  const src: string
  export default src
}
