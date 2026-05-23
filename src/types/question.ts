export type BaseQuestionType = 'single' | 'multiple' | 'trueFalse' | 'shortAnswer'
export type ThemeName = 'monochrome' | 'colorful' | 'gaussian-blur'
export type ActivityStatus = 'idle' | 'running' | 'paused' | 'finished'
export type ImportEncoding = 'auto' | 'utf-8' | 'utf-16le' | 'utf-16be' | 'gb18030'

export interface QuestionTypeConfig {
  id: string
  name: string
  baseType: BaseQuestionType
  enabled: boolean
  difficultyIds: string[]
  countdownSeconds: number
  createdAt: string
  updatedAt: string
}

export interface DifficultyConfig {
  id: string
  name: string
  order: number
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface QuestionOption {
  id: string
  label?: string
  content: string
  order: number
}

export interface Question {
  id: string
  customTypeId: string
  customTypeName: string
  baseType: BaseQuestionType
  difficultyId: string
  difficultyName: string
  content: string
  options: QuestionOption[]
  answer: string | string[]
  analysis?: string
  tags: string[]
  remark?: string
  enabled: boolean
  selected: boolean
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  name: string
  description: string
  questionTypes: QuestionTypeConfig[]
  difficulties: DifficultyConfig[]
  questions: Question[]
  activitySettings: {
    randomMode: 'random'
    allowRepeat: boolean
    selectedQuestionIds: string[]
  }
  soundConfig: {
    id: string
    name: string
    type: 'default' | 'custom'
    fileName?: string
    volume: number
    loop: boolean
  }
  themeConfig: {
    currentTheme: ThemeName
    defaultTheme: ThemeName
  }
  createdAt: string
  updatedAt: string
}

export interface ImportRow {
  row: number
  question?: Question
  errors: string[]
}

export interface ActivityRuntimeState {
  status: ActivityStatus
  currentQuestionId: string
  remainingQuestionIds: string[]
  completedQuestionIds: string[]
  currentCountdownSeconds: number
  answerVisible: boolean
  startedAt: string
  finishedAt: string
}

export interface ReadinessItem {
  label: string
  ready: boolean
}
