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

interface QuestionApi {
  loadProjects: () => Promise<unknown>
  saveProjects: (projects: unknown) => Promise<{ ok: boolean }>
  getDataPath: () => Promise<string>
  showOpenDialog: (options: ElectronOpenDialogOptions) => Promise<ElectronOpenDialogReturnValue>
  showSaveDialog: (options: ElectronSaveDialogOptions) => Promise<ElectronSaveDialogReturnValue>
}

interface Window {
  questionApi?: QuestionApi
}
