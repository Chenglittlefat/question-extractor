<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import * as XLSX from 'xlsx'
import ActivityPanel from './components/ActivityPanel.vue'
import AppSidebar from './components/AppSidebar.vue'
import AppTopbar from './components/AppTopbar.vue'
import CountdownPanel from './components/CountdownPanel.vue'
import DifficultyPanel from './components/DifficultyPanel.vue'
import ImportPanel from './components/ImportPanel.vue'
import NewProjectModal from './components/NewProjectModal.vue'
import OperationGuide from './components/OperationGuide.vue'
import ProjectHome from './components/ProjectHome.vue'
import ProjectPanel from './components/ProjectPanel.vue'
import QuestionManagePanel from './components/QuestionManagePanel.vue'
import QuestionTypePanel from './components/QuestionTypePanel.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import VersionInfo from './components/VersionInfo.vue'
import FinishView from './components/FinishView.vue'
import SvgIcon from './components/SvgIcon.vue'
import { icons } from './assets/icons'
import type {
  ActivityStatus,
  BaseQuestionType,
  DifficultyConfig,
  ImportEncoding,
  ImportRow,
  Project,
  Question,
  QuestionOption,
  ThemeName,
  QuestionTypeConfig,
} from './types/question'

type AppView = 'home' | 'workspace' | 'activity' | 'finish' | 'settings' | 'help' | 'version'

const chromeMenus = ['文件', '编辑', '查看', '窗口', '帮助']
const appPlatform = window.questionApi?.platform ?? 'web'
const isMac = appPlatform === 'darwin'

const baseTypeLabels: Record<BaseQuestionType, string> = {
  single: '单选题',
  multiple: '多选题',
  trueFalse: '判断题',
  shortAnswer: '简答题',
}

const tabs = [
  { id: 'project', label: '项目信息', icon: icons.config },
  { id: 'types', label: '题型设置', icon: icons.questionType },
  { id: 'difficulties', label: '难度设置', icon: icons.difficulty },
  { id: 'countdown', label: '倒计时', icon: icons.countdown },
  { id: 'import', label: '题目导入', icon: icons.upload },
  { id: 'questions', label: '题目管理', icon: icons.checkList },
] as const

type TabId = (typeof tabs)[number]['id']

const templateOptionCount = 8
const now = () => new Date().toISOString()
const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const makeDifficulty = (name: string, order: number): DifficultyConfig => {
  const timestamp = now()
  return { id: uid('difficulty'), name, order, enabled: true, createdAt: timestamp, updatedAt: timestamp }
}

const makeType = (
  name: string,
  baseType: BaseQuestionType,
  difficultyIds: string[],
  countdownSeconds = 30,
): QuestionTypeConfig => {
  const timestamp = now()
  return {
    id: uid('type'),
    name,
    baseType,
    enabled: true,
    difficultyIds,
    countdownSeconds,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

const makeProject = (name = '我的抽题活动', description = '用于课堂、培训或现场问答的离线抽题项目。'): Project => {
  const timestamp = now()
  const difficulties = ['简单', '中等', '困难'].map(makeDifficulty)
  const difficultyIds = difficulties.map((difficulty) => difficulty.id)
  return {
    id: uid('project'),
    name,
    description,
    questionTypes: [
      makeType('理论单选', 'single', difficultyIds, 30),
      makeType('案例多选', 'multiple', difficultyIds, 60),
      makeType('快速判断', 'trueFalse', difficultyIds, 15),
      makeType('主观简答', 'shortAnswer', difficultyIds, 180),
    ],
    difficulties,
    questions: [],
    activitySettings: { randomMode: 'random', allowRepeat: false, selectedQuestionIds: [] },
    soundConfig: { id: 'default-bell', name: '默认提示音', type: 'default', volume: 0.55, loop: false },
    themeConfig: { currentTheme: 'monochrome', defaultTheme: 'monochrome' },
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const normalizeString = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback)
const normalizeBoolean = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback)
const normalizeStringArray = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [])
const normalizeTheme = (value: unknown): ThemeName =>
  ['monochrome', 'colorful', 'gaussian-blur'].includes(String(value)) ? (value as ThemeName) : 'monochrome'

const normalizeQuestion = (value: unknown, fallbackType: QuestionTypeConfig, fallbackDifficulty: DifficultyConfig): Question | null => {
  if (!isRecord(value)) return null
  const timestamp = now()
  const baseType = ['single', 'multiple', 'trueFalse', 'shortAnswer'].includes(String(value.baseType))
    ? (value.baseType as BaseQuestionType)
    : fallbackType.baseType
  const rawOptions = Array.isArray(value.options) ? value.options : []
  const options = rawOptions
    .filter(isRecord)
    .map((option, index) => ({
      id: normalizeString(option.id, uid('option')),
      label: typeof option.label === 'string' ? option.label : undefined,
      content: normalizeString(option.content),
      order: typeof option.order === 'number' ? option.order : index + 1,
    }))
  const rawAnswer = value.answer
  const answer = Array.isArray(rawAnswer) ? rawAnswer.map(String) : normalizeString(rawAnswer)
  return {
    id: normalizeString(value.id, uid('question')),
    customTypeId: normalizeString(value.customTypeId, fallbackType.id),
    customTypeName: normalizeString(value.customTypeName, fallbackType.name),
    baseType,
    difficultyId: normalizeString(value.difficultyId, fallbackDifficulty.id),
    difficultyName: normalizeString(value.difficultyName, fallbackDifficulty.name),
    content: normalizeString(value.content),
    options,
    answer,
    analysis: normalizeString(value.analysis),
    tags: normalizeStringArray(value.tags),
    remark: normalizeString(value.remark),
    enabled: normalizeBoolean(value.enabled, true),
    selected: normalizeBoolean(value.selected, true),
    createdAt: normalizeString(value.createdAt, timestamp),
    updatedAt: normalizeString(value.updatedAt, timestamp),
  }
}

const normalizeProject = (value: unknown): Project | null => {
  if (!isRecord(value)) return null
  const fallback = makeProject(normalizeString(value.name, '我的抽题活动'), normalizeString(value.description))
  const questionTypes = (Array.isArray(value.questionTypes) ? value.questionTypes : [])
    .filter(isRecord)
    .map((item, index) => ({
      id: normalizeString(item.id, uid('type')),
      name: normalizeString(item.name, `题型 ${index + 1}`),
      baseType: ['single', 'multiple', 'trueFalse', 'shortAnswer'].includes(String(item.baseType)) ? (item.baseType as BaseQuestionType) : 'single',
      enabled: normalizeBoolean(item.enabled, true),
      difficultyIds: normalizeStringArray(item.difficultyIds),
      countdownSeconds: typeof item.countdownSeconds === 'number' ? item.countdownSeconds : 30,
      createdAt: normalizeString(item.createdAt, fallback.createdAt),
      updatedAt: normalizeString(item.updatedAt, fallback.updatedAt),
    }))
  const difficulties = (Array.isArray(value.difficulties) ? value.difficulties : [])
    .filter(isRecord)
    .map((item, index) => ({
      id: normalizeString(item.id, uid('difficulty')),
      name: normalizeString(item.name, `难度 ${index + 1}`),
      order: typeof item.order === 'number' ? item.order : index + 1,
      enabled: normalizeBoolean(item.enabled, true),
      createdAt: normalizeString(item.createdAt, fallback.createdAt),
      updatedAt: normalizeString(item.updatedAt, fallback.updatedAt),
    }))
  const migratedTypes = questionTypes.length ? questionTypes : fallback.questionTypes
  const migratedDifficulties = difficulties.length ? difficulties : fallback.difficulties
  const fallbackType = migratedTypes[0] ?? fallback.questionTypes[0]
  const fallbackDifficulty = migratedDifficulties[0] ?? fallback.difficulties[0]
  const questions = (Array.isArray(value.questions) ? value.questions : [])
    .map((item) => normalizeQuestion(item, fallbackType, fallbackDifficulty))
    .filter((item): item is Question => Boolean(item))
  const activitySettings = isRecord(value.activitySettings) ? value.activitySettings : {}
  const soundConfig = isRecord(value.soundConfig) ? value.soundConfig : {}
  const themeConfig = isRecord(value.themeConfig) ? value.themeConfig : {}
  return {
    id: normalizeString(value.id, fallback.id),
    name: normalizeString(value.name, fallback.name),
    description: normalizeString(value.description, fallback.description),
    questionTypes: migratedTypes,
    difficulties: migratedDifficulties,
    questions,
    activitySettings: {
      randomMode: 'random',
      allowRepeat: normalizeBoolean(activitySettings.allowRepeat, false),
      selectedQuestionIds: normalizeStringArray(activitySettings.selectedQuestionIds),
    },
    soundConfig: {
      id: normalizeString(soundConfig.id, fallback.soundConfig.id),
      name: normalizeString(soundConfig.name, fallback.soundConfig.name),
      type: soundConfig.type === 'custom' ? 'custom' : 'default',
      fileName: normalizeString(soundConfig.fileName) || undefined,
      volume: typeof soundConfig.volume === 'number' ? soundConfig.volume : fallback.soundConfig.volume,
      loop: normalizeBoolean(soundConfig.loop, fallback.soundConfig.loop),
    },
    themeConfig: {
      currentTheme: normalizeTheme(themeConfig.currentTheme),
      defaultTheme: normalizeTheme(themeConfig.defaultTheme),
    },
    createdAt: normalizeString(value.createdAt, fallback.createdAt),
    updatedAt: normalizeString(value.updatedAt, fallback.updatedAt),
  }
}

const normalizeProjects = (value: unknown): Project[] => {
  if (!Array.isArray(value)) return [makeProject()]
  if (!value.length) return []
  const normalized = value.map(normalizeProject).filter((item): item is Project => Boolean(item))
  return normalized.length ? normalized : [makeProject()]
}

const projects = ref<Project[]>([makeProject()])
const emptyProject = makeProject('', '')
const activeProjectId = ref(projects.value[0]?.id ?? '')
const activeTab = ref<TabId>('project')
const activeView = ref<AppView>('home')
const showNewProjectModal = ref(false)
const showHelpMenu = ref(false)
const notice = ref('项目正在载入，本机 SQLite 会保存所有项目数据。')
const isHydrated = ref(false)
const dataPath = ref('')
const typeDraft = reactive({ name: '', baseType: 'single' as BaseQuestionType, countdownSeconds: 30 })
const difficultyDraft = reactive({ name: '' })
const importEncoding = ref<ImportEncoding>('auto')
const importRows = ref<ImportRow[]>([])
const importBatch = ref(0)
const filters = reactive({ keyword: '', typeId: 'all', difficultyId: 'all', selected: 'all', enabled: 'all', tag: '' })
const customSoundUrl = ref('')
const customSound = ref<HTMLAudioElement | null>(null)
let oscillator: OscillatorNode | null = null
let audioContext: AudioContext | null = null
let timer: number | undefined

const activity = reactive({
  status: 'idle' as ActivityStatus,
  currentQuestionId: '',
  remainingQuestionIds: [] as string[],
  completedQuestionIds: [] as string[],
  currentCountdownSeconds: 0,
  answerVisible: false,
  startedAt: '',
  finishedAt: '',
})

const project = computed(() => projects.value.find((item) => item.id === activeProjectId.value) ?? projects.value[0] ?? emptyProject)
const enabledTypes = computed(() => project.value.questionTypes.filter((item) => item.enabled))
const enabledDifficulties = computed(() => project.value.difficulties.filter((item) => item.enabled).sort((a, b) => a.order - b.order))
const selectedQuestions = computed(() => project.value.questions.filter((item) => item.enabled && item.selected))
const currentQuestion = computed(() => project.value.questions.find((item) => item.id === activity.currentQuestionId))
const importValidCount = computed(() => importRows.value.filter((row) => row.question && !row.errors.length).length)
const importErrorCount = computed(() => importRows.value.filter((row) => row.errors.length).length)

const filteredQuestions = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase()
  const tag = filters.tag.trim().toLowerCase()
  return project.value.questions.filter((question) => {
    const matchesKeyword =
      !keyword ||
      question.content.toLowerCase().includes(keyword) ||
      answerText(question.answer).toLowerCase().includes(keyword) ||
      question.tags.some((item) => item.toLowerCase().includes(keyword))
    const matchesTag = !tag || question.tags.some((item) => item.toLowerCase().includes(tag))
    const matchesType = filters.typeId === 'all' || question.customTypeId === filters.typeId
    const matchesDifficulty = filters.difficultyId === 'all' || question.difficultyId === filters.difficultyId
    const matchesSelected = filters.selected === 'all' || String(question.selected) === filters.selected
    const matchesEnabled = filters.enabled === 'all' || String(question.enabled) === filters.enabled
    return matchesKeyword && matchesTag && matchesType && matchesDifficulty && matchesSelected && matchesEnabled
  })
})

const selectedQuestionRate = computed(() => {
  if (!project.value.questions.length) return 0
  return Math.round((selectedQuestions.value.length / project.value.questions.length) * 100)
})

const importReady = computed(
  () => enabledTypes.value.length > 0 && enabledDifficulties.value.length > 0 && project.value.name.trim().length > 0,
)

const activityReadyItems = computed(() => [
  { label: '项目名称', ready: project.value.name.trim().length > 0 },
  { label: '启用题型', ready: enabledTypes.value.length > 0 },
  { label: '启用难度', ready: enabledDifficulties.value.length > 0 },
  { label: '已选题目', ready: selectedQuestions.value.length > 0 },
])

const activityProgress = computed(() => {
  const total = activity.completedQuestionIds.length + activity.remainingQuestionIds.length
  if (!total) return 0
  return Math.round((activity.completedQuestionIds.length / total) * 100)
})

const currentCountdownTotal = computed(() => {
  const type = project.value.questionTypes.find((item) => item.id === currentQuestion.value?.customTypeId)
  return Math.max(1, type?.countdownSeconds ?? activity.currentCountdownSeconds ?? 30)
})

const timerDashOffset = computed(() => {
  const circumference = 339.292
  const ratio = Math.max(0, Math.min(1, activity.currentCountdownSeconds / currentCountdownTotal.value))
  return circumference * (1 - ratio)
})

const completedQuestions = computed(() =>
  activity.completedQuestionIds
    .map((id) => project.value.questions.find((question) => question.id === id))
    .filter((question): question is Question => Boolean(question)),
)

watch(
  projects,
  async () => {
    if (!isHydrated.value) return
    if (window.questionApi) {
      await window.questionApi.saveProjects(projects.value)
    }
  },
  { deep: true },
)

watch(
  () => project.value.themeConfig.currentTheme,
  (theme) => {
    document.documentElement.dataset.theme = theme
  },
  { immediate: true },
)

function touchProject(message = '已保存当前项目。') {
  project.value.updatedAt = now()
  project.value.activitySettings.selectedQuestionIds = selectedQuestions.value.map((question) => question.id)
  notice.value = message
}

function createProject() {
  showNewProjectModal.value = true
}

function confirmCreateProject(payload: { name: string; description: string }) {
  const nextProject = makeProject(payload.name, payload.description)
  projects.value.unshift(nextProject)
  activeProjectId.value = nextProject.id
  activeTab.value = 'project'
  activeView.value = 'workspace'
  showNewProjectModal.value = false
  resetActivity()
  notice.value = '已创建新项目。'
}

function openProject(id: string) {
  activeProjectId.value = id
  activeTab.value = 'project'
  activeView.value = 'workspace'
  resetActivity()
}

function backToWorkspaceFromActivity() {
  resetActivity()
  activeView.value = 'workspace'
}

function backHome() {
  resetActivity()
  activeView.value = 'home'
}

function openSettings() {
  if (!projects.value.length) {
    notice.value = '请先创建项目，再进入项目设置。'
    return
  }
  activeProjectId.value = project.value.id
  activeView.value = 'settings'
  showHelpMenu.value = false
}

function handleChromeMenu(menu: string) {
  showHelpMenu.value = menu === '帮助' ? !showHelpMenu.value : false
}

function openOperationGuide() {
  activeView.value = 'help'
  showHelpMenu.value = false
}

function openVersionInfo() {
  activeView.value = 'version'
  showHelpMenu.value = false
}

function deleteProject(id: string) {
  if (projects.value.length <= 1) {
    notice.value = '最后一个项目不能删除。'
    return
  }
  const existed = projects.value.some((item) => item.id === id)
  if (!existed) return
  projects.value = projects.value.filter((item) => item.id !== id)
  activeProjectId.value = projects.value.find((item) => item.id === activeProjectId.value)?.id ?? projects.value[0]?.id ?? ''
  resetActivity()
  notice.value = '已删除项目。'
}

function addType() {
  const name = typeDraft.name.trim()
  if (!name) {
    notice.value = '题型名称不能为空。'
    return
  }
  if (project.value.questionTypes.some((item) => item.name === name)) {
    notice.value = '题型名称不能重复。'
    return
  }
  project.value.questionTypes.push(makeType(name, typeDraft.baseType, enabledDifficulties.value.map((item) => item.id), typeDraft.countdownSeconds))
  typeDraft.name = ''
  touchProject('已新增自定义题型。')
}

function removeType(id: string) {
  if (project.value.questions.some((question) => question.customTypeId === id)) {
    notice.value = '该题型已有题目引用，不能删除，可先禁用。'
    return
  }
  project.value.questionTypes = project.value.questionTypes.filter((item) => item.id !== id)
  touchProject('已删除题型。')
}

function addDifficulty() {
  const name = difficultyDraft.name.trim()
  if (!name) {
    notice.value = '难度名称不能为空。'
    return
  }
  if (project.value.difficulties.some((item) => item.name === name)) {
    notice.value = '难度名称不能重复。'
    return
  }
  project.value.difficulties.push(makeDifficulty(name, project.value.difficulties.length + 1))
  difficultyDraft.name = ''
  touchProject('已新增难度。')
}

function removeDifficulty(id: string) {
  if (project.value.questions.some((question) => question.difficultyId === id)) {
    notice.value = '该难度已有题目引用，不能删除，可先禁用。'
    return
  }
  project.value.difficulties = project.value.difficulties.filter((item) => item.id !== id)
  project.value.questionTypes.forEach((type) => {
    type.difficultyIds = type.difficultyIds.filter((difficultyId) => difficultyId !== id)
  })
  touchProject('已删除难度。')
}

function moveDifficulty(index: number, direction: -1 | 1) {
  const next = index + direction
  if (next < 0 || next >= project.value.difficulties.length) return
  const list = project.value.difficulties
  const currentItem = list[index]
  const nextItem = list[next]
  if (!currentItem || !nextItem) return
  list[index] = nextItem
  list[next] = currentItem
  list.forEach((item, itemIndex) => {
    item.order = itemIndex + 1
    item.updatedAt = now()
  })
  touchProject('已调整难度顺序。')
}

function toggleTypeDifficulty(type: QuestionTypeConfig, difficultyId: string) {
  if (type.difficultyIds.includes(difficultyId)) {
    type.difficultyIds = type.difficultyIds.filter((item) => item !== difficultyId)
  } else {
    type.difficultyIds.push(difficultyId)
  }
  type.updatedAt = now()
  touchProject('已更新题型可用难度。')
}

function exportTemplate() {
  const optionHeaders = Array.from({ length: templateOptionCount }, (_, index) => `选项${index + 1}`)
  const headers = ['题型', '基础题型', '难度', '题干', ...optionHeaders, '正确答案', '解析', '是否启用', '标签', '备注']
  const sampleType = enabledTypes.value.find((item) => item.baseType === 'multiple') ?? enabledTypes.value[0]
  const sampleDifficulty = enabledDifficulties.value[0]
  const sampleOptions =
    sampleType?.baseType === 'trueFalse'
      ? ['正确', '错误']
      : sampleType?.baseType === 'shortAnswer'
        ? []
        : ['项目保存', '随机抽题', '倒计时', '云端登录', '本地备份', '批量导入']
  const paddedSampleOptions = Array.from({ length: templateOptionCount }, (_, index) => sampleOptions[index] ?? '')
  const sampleAnswer =
    sampleType?.baseType === 'multiple'
      ? '项目保存;随机抽题;倒计时'
      : sampleType?.baseType === 'trueFalse'
        ? '正确'
        : sampleType?.baseType === 'shortAnswer'
          ? '支持离线保存题库、导入题目并随机抽题。'
          : sampleOptions[0] ?? ''
  const rows = [
    headers,
    [
      sampleType?.name ?? '理论单选',
      sampleType ? baseTypeLabels[sampleType.baseType] : '单选题',
      sampleDifficulty?.name ?? '简单',
      '以下哪些能力属于离线抽题软件？',
      ...paddedSampleOptions,
      sampleAnswer,
      '本题演示多列选项和分号答案。',
      '是',
      '示例;培训',
      '超过 8 个选项时可继续新增选项9、选项10；判断题可只填 2 个选项或留空。',
    ],
  ]
  const worksheet = XLSX.utils.aoa_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '题目导入模板')
  XLSX.writeFile(workbook, `question-template-${Date.now()}.xlsx`)
  notice.value = '已生成 xlsx 导入模板。'
}

async function handleImportFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  importRows.value = []
  importBatch.value += 1
  if (file.name.endsWith('.json')) {
    await importBackupFile(file)
    input.value = ''
    return
  }
  if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
    importRows.value = await parseWorkbookFile(file)
  } else {
    const text = await readTextFile(file, importEncoding.value)
    importRows.value = parseQuestionTable(text, file.name.endsWith('.tsv') ? '\t' : ',')
  }
  notice.value = `已解析 ${importRows.value.length} 行，合法 ${importValidCount.value} 行，异常 ${importErrorCount.value} 行。`
  input.value = ''
}

function confirmImport() {
  const validQuestions = importRows.value.flatMap((row) => (row.question && !row.errors.length ? [row.question] : []))
  if (!validQuestions.length) {
    notice.value = '没有可导入的合法题目。'
    return
  }
  const existingKeys = new Set(project.value.questions.map((question) => `${question.customTypeId}:${question.content}`))
  const deduped = validQuestions.filter((question) => !existingKeys.has(`${question.customTypeId}:${question.content}`))
  project.value.questions.push(...deduped)
  importRows.value = []
  touchProject(`已导入 ${deduped.length} 道题，跳过 ${validQuestions.length - deduped.length} 道重复题。`)
}

function parseQuestionTable(text: string, delimiter: ',' | '\t'): ImportRow[] {
  const workbook = XLSX.read(text.replace(/^\uFEFF/, ''), { type: 'string', FS: delimiter, raw: true })
  const firstSheet = workbook.SheetNames[0]
  if (!firstSheet) return []
  const sheet = workbook.Sheets[firstSheet]
  const table = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '', blankrows: false, raw: true })
  const [headers = [], ...rows] = table.map((row) => row.map((cell) => String(cell ?? '')))
  return rows.map((row, index) => buildImportRow(row, headers, index + 2))
}

async function parseWorkbookFile(file: File): Promise<ImportRow[]> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const firstSheet = workbook.SheetNames[0]
  if (!firstSheet) return []
  const sheet = workbook.Sheets[firstSheet]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  const headers = Object.keys(rows[0] ?? {})
  return rows.map((row, index) => buildImportRow(headers.map((header) => String(row[header] ?? '')), headers, index + 2))
}

function buildImportRow(values: string[], headers: string[], rowNumber: number): ImportRow {
  const valueOf = (name: string) => values[headers.indexOf(name)]?.trim() ?? ''
  const errors: string[] = []
  const typeName = valueOf('题型')
  const difficultyName = valueOf('难度')
  const content = valueOf('题干')
  const type = project.value.questionTypes.find((item) => item.name === typeName)
  const difficulty = project.value.difficulties.find((item) => item.name === difficultyName)
  if (!type) errors.push(`题型不存在：${typeName || '空'}`)
  if (!difficulty) errors.push(`难度不存在：${difficultyName || '空'}`)
  if (!content) errors.push('题干不能为空')

  const rawOptions = collectOptions(values, headers, valueOf('选项'))
  const answer = parseAnswer(valueOf('正确答案'), type?.baseType, rawOptions)
  const answers = Array.isArray(answer) ? answer : [answer]
  if (type && type.baseType !== 'shortAnswer' && type.baseType !== 'trueFalse' && rawOptions.length < 2) errors.push('单选/多选题至少需要 2 个选项')
  if (type?.baseType === 'single' && answers.length !== 1) errors.push('单选题只能有 1 个正确答案')
  if (type?.baseType === 'multiple' && (!Array.isArray(answer) || answer.length < 1)) errors.push('多选题至少需要 1 个正确答案')
  if (type?.baseType === 'trueFalse' && !['正确', '错误', '是', '否', 'true', 'false'].includes(answerText(answer).toLowerCase())) errors.push('判断题答案不合法')
  if (type?.baseType === 'shortAnswer' && !answerText(answer)) errors.push('简答题答案不能为空')

  const optionTexts = rawOptions.map((item) => item.content)
  if (type && ['single', 'multiple'].includes(type.baseType)) {
    const missing = answers.filter((item) => !optionTexts.includes(item) && !rawOptions.some((option) => option.label === item))
    if (missing.length) errors.push(`正确答案不在选项中：${missing.join('、')}`)
  }

  const question =
    type && difficulty && content
      ? {
          id: valueOf('题目ID') || uid('question'),
          customTypeId: type.id,
          customTypeName: type.name,
          baseType: type.baseType,
          difficultyId: difficulty.id,
          difficultyName: difficulty.name,
          content,
          options: rawOptions,
          answer: type.baseType === 'single' ? answers[0] ?? '' : answer,
          analysis: valueOf('解析'),
          tags: splitList(valueOf('标签')),
          remark: valueOf('备注'),
          enabled: valueOf('是否启用') !== '否',
          selected: true,
          createdAt: now(),
          updatedAt: now(),
        }
      : undefined
  return { row: rowNumber, question, errors }
}

function collectOptions(values: string[], headers: string[], optionCell: string): QuestionOption[] {
  let options = parseOptions(optionCell)
  const dynamicOptions = headers
    .map((header, index) => ({ header, value: values[index]?.trim() ?? '' }))
    .filter((item) => /^选项\d+$/.test(item.header) && item.value)
    .sort((first, second) => Number(first.header.replace('选项', '')) - Number(second.header.replace('选项', '')))
    .map((item, index) => ({ id: uid('option'), label: String(index + 1), content: item.value, order: index + 1 }))
  if (dynamicOptions.length) options = dynamicOptions
  return options
}

function parseOptions(input: string): QuestionOption[] {
  if (!input) return []
  try {
    const parsed = JSON.parse(input) as unknown
    if (Array.isArray(parsed)) {
      return parsed.map((item, index) => ({ id: uid('option'), label: String(index + 1), content: String(item), order: index + 1 }))
    }
  } catch {
    // Fall back to delimiter parsing below.
  }
  return splitList(input).map((item, index) => ({ id: uid('option'), label: String(index + 1), content: item, order: index + 1 }))
}

function parseAnswer(input: string, baseType?: BaseQuestionType, options: QuestionOption[] = []): string | string[] {
  const normalized = input.trim()
  if (baseType === 'multiple') {
    try {
      const parsed = JSON.parse(normalized) as unknown
      if (Array.isArray(parsed)) return normalizeChoiceAnswers(parsed.map(String), options)
    } catch {
      // Fall back to delimiter parsing below.
    }
    const answers = splitList(normalized)
    const compactLetterAnswers = /^[a-z]+$/i.test(normalized) && answers.length === 1 && normalized.length > 1
    return normalizeChoiceAnswers(compactLetterAnswers ? normalized.toUpperCase().split('') : answers, options)
  }
  if (baseType === 'single') return normalizeChoiceAnswers(splitList(normalized), options)
  return normalized
}

function normalizeChoiceAnswers(answers: string[], options: QuestionOption[]) {
  return answers.map((answer) => normalizeChoiceAnswer(answer, options))
}

function normalizeChoiceAnswer(answer: string, options: QuestionOption[]) {
  const normalized = answer.trim()
  const matchedByText = options.find((option) => option.label === normalized || option.content === normalized)
  if (matchedByText) return normalized
  const letterIndex = /^[a-z]$/i.test(normalized) ? normalized.toUpperCase().charCodeAt(0) - 65 : -1
  const option = letterIndex >= 0 ? options[letterIndex] : undefined
  return option?.label ?? normalized
}

function splitList(value: string) {
  return value
    .split(/[;,，；、|]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

async function readTextFile(file: File, encoding: ImportEncoding) {
  const buffer = await file.arrayBuffer()
  const detected = encoding === 'auto' ? detectEncoding(buffer) : encoding
  return new TextDecoder(detected).decode(buffer)
}

function detectEncoding(buffer: ArrayBuffer): Exclude<ImportEncoding, 'auto'> {
  const bytes = new Uint8Array(buffer).slice(0, 4)
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return 'utf-16le'
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return 'utf-16be'
  return 'utf-8'
}

function bulkSelect(action: 'allFiltered' | 'none' | 'invert') {
  const filteredIds = new Set(filteredQuestions.value.map((question) => question.id))
  project.value.questions.forEach((question) => {
    if (action === 'none') question.selected = false
    if (action === 'allFiltered' && filteredIds.has(question.id)) question.selected = true
    if (action === 'invert' && filteredIds.has(question.id)) question.selected = !question.selected
  })
  touchProject('已更新题目选择状态。')
}

function bulkEnabled(enabled: boolean) {
  const filteredIds = new Set(filteredQuestions.value.map((question) => question.id))
  project.value.questions.forEach((question) => {
    if (filteredIds.has(question.id)) question.enabled = enabled
  })
  touchProject(enabled ? '已批量启用题目。' : '已批量禁用题目。')
}

function deleteFilteredQuestions() {
  if (!filteredQuestions.value.length) return
  if (!window.confirm(`确认删除当前筛选出的 ${filteredQuestions.value.length} 道题吗？`)) return
  const filteredIds = new Set(filteredQuestions.value.map((question) => question.id))
  project.value.questions = project.value.questions.filter((question) => !filteredIds.has(question.id))
  touchProject('已删除筛选题目。')
}

function startActivity() {
  if (!project.value.name.trim()) {
    notice.value = '项目名称为空，不能开始活动。'
    activeTab.value = 'project'
    return
  }
  if (!enabledTypes.value.length || !enabledDifficulties.value.length) {
    notice.value = '请至少保留 1 个启用题型和 1 个启用难度。'
    return
  }
  const ids = selectedQuestions.value.map((question) => question.id)
  if (!ids.length) {
    notice.value = '没有可抽取题目，请先导入并选择启用题目。'
    activeTab.value = 'questions'
    return
  }
  activity.status = 'running'
  activity.remainingQuestionIds = shuffle(ids)
  activity.completedQuestionIds = []
  activity.startedAt = now()
  activity.finishedAt = ''
  drawNextQuestion()
  activeView.value = 'activity'
}

function drawNextQuestion() {
  stopSound()
  if (!activity.remainingQuestionIds.length) {
    finishActivity()
    return
  }
  const nextId = activity.remainingQuestionIds.shift()
  if (!nextId) return
  activity.currentQuestionId = nextId
  activity.completedQuestionIds.push(nextId)
  activity.answerVisible = false
  const question = project.value.questions.find((item) => item.id === nextId)
  const type = project.value.questionTypes.find((item) => item.id === question?.customTypeId)
  activity.currentCountdownSeconds = type?.countdownSeconds ?? 30
  activity.status = 'running'
  startTimer()
}

function startTimer() {
  window.clearInterval(timer)
  timer = window.setInterval(() => {
    if (activity.status !== 'running') return
    activity.currentCountdownSeconds -= 1
    if (activity.currentCountdownSeconds <= 0) {
      activity.currentCountdownSeconds = 0
      window.clearInterval(timer)
      playSound()
    }
  }, 1000)
}

function pauseTimer() {
  activity.status = 'paused'
}

function resumeTimer() {
  if (!currentQuestion.value) return
  activity.status = 'running'
  startTimer()
}

function resetTimer() {
  const type = project.value.questionTypes.find((item) => item.id === currentQuestion.value?.customTypeId)
  activity.currentCountdownSeconds = type?.countdownSeconds ?? 30
  activity.status = 'running'
  startTimer()
}

function revealAnswer() {
  activity.answerVisible = !activity.answerVisible
  stopSound()
}

function finishActivity() {
  window.clearInterval(timer)
  stopSound()
  activity.status = 'finished'
  activity.finishedAt = now()
  activity.currentQuestionId = ''
  activeView.value = 'finish'
}

function resetActivity() {
  window.clearInterval(timer)
  stopSound()
  activity.status = 'idle'
  activity.currentQuestionId = ''
  activity.remainingQuestionIds = []
  activity.completedQuestionIds = []
  activity.currentCountdownSeconds = 0
  activity.answerVisible = false
  activity.startedAt = ''
  activity.finishedAt = ''
}

function playSound() {
  stopSound()
  if (project.value.soundConfig.type === 'custom' && customSoundUrl.value) {
    customSound.value = new Audio(customSoundUrl.value)
    customSound.value.volume = project.value.soundConfig.volume
    customSound.value.loop = project.value.soundConfig.loop
    void customSound.value.play().catch(() => {
      notice.value = '自定义音效无法播放，已回退到默认提示音。'
      project.value.soundConfig.type = 'default'
      playDefaultTone()
    })
    return
  }
  playDefaultTone()
}

function playDefaultTone() {
  audioContext = new AudioContext()
  const gain = audioContext.createGain()
  oscillator = audioContext.createOscillator()
  oscillator.type = 'sine'
  oscillator.frequency.value = 880
  gain.gain.value = project.value.soundConfig.volume
  oscillator.connect(gain)
  gain.connect(audioContext.destination)
  oscillator.start()
  if (!project.value.soundConfig.loop) {
    window.setTimeout(stopSound, 900)
  }
}

function stopSound() {
  customSound.value?.pause()
  customSound.value = null
  oscillator?.stop()
  oscillator = null
  void audioContext?.close()
  audioContext = null
}

function handleSoundFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (customSoundUrl.value) URL.revokeObjectURL(customSoundUrl.value)
  customSoundUrl.value = URL.createObjectURL(file)
  project.value.soundConfig.type = 'custom'
  project.value.soundConfig.name = file.name
  project.value.soundConfig.fileName = file.name
  touchProject('已选择自定义音效。本浏览器版会在当前会话中保留音频文件。')
}

function exportBackup() {
  const backup = { version: '1.0.0', exportedAt: now(), project: project.value }
  downloadText(`${project.value.name || 'question-project'}-backup.json`, JSON.stringify(backup, null, 2), 'application/json')
  notice.value = '已导出 JSON 完整备份。'
}

async function importBackupFile(file: File) {
  try {
    const backup = JSON.parse(await file.text()) as { project?: unknown }
    if (!isRecord(backup.project) || !normalizeString(backup.project.id)) throw new Error('Invalid backup')
    const incoming = normalizeProject(backup.project)
    if (!incoming) throw new Error('Invalid backup')
    if (projects.value.some((item) => item.id === incoming.id)) incoming.id = uid('project')
    projects.value.unshift(incoming)
    activeProjectId.value = incoming.id
    resetActivity()
    notice.value = '已从 JSON 备份恢复项目。'
  } catch {
    notice.value = '备份文件损坏，无法恢复。'
  }
}

function downloadText(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function answerText(answer: string | string[]) {
  return Array.isArray(answer) ? answer.join('；') : answer
}

function formatTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

function formatDate(value: string) {
  return value ? new Date(value).toLocaleString() : '-'
}

function elapsedTime() {
  if (!activity.startedAt || !activity.finishedAt) return '-'
  return formatTimer(Math.max(0, Math.floor((Date.parse(activity.finishedAt) - Date.parse(activity.startedAt)) / 1000)))
}

function shuffle(items: string[]) {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const item = result[index]
    result[index] = result[swapIndex] as string
    result[swapIndex] = item as string
  }
  return result
}

function minimizeWindow() {
  void window.questionApi?.minimizeWindow()
}

function toggleMaximizeWindow() {
  void window.questionApi?.toggleMaximizeWindow()
}

function closeWindow() {
  void window.questionApi?.closeWindow()
}

onBeforeUnmount(() => {
  window.clearInterval(timer)
  stopSound()
  if (customSoundUrl.value) URL.revokeObjectURL(customSoundUrl.value)
})

onMounted(async () => {
  if (window.questionApi) {
    const storedProjects = normalizeProjects(await window.questionApi.loadProjects())
    projects.value = storedProjects
    activeProjectId.value = storedProjects[0]?.id ?? ''
    dataPath.value = await window.questionApi.getDataPath()
    notice.value = `项目已载入，SQLite 数据目录：${dataPath.value}`
  } else {
    notice.value = '当前运行在浏览器预览模式，刷新后会使用内存中的示例项目。'
  }
  isHydrated.value = true
})
</script>

<template>
  <div class="desktop-shell" :data-platform="appPlatform">
    <header class="chrome-titlebar">
      <div class="chrome-left">
        <div class="chrome-app-icon" aria-hidden="true">
          <SvgIcon :src="icons.appLogo" />
        </div>
        <button class="chrome-nav" type="button" title="返回" @click="activeView === 'home' ? undefined : backHome()">
          <SvgIcon :src="icons.arrowLeft" />
        </button>
        <button class="chrome-nav" type="button" title="前进" disabled>
          <span aria-hidden="true">›</span>
        </button>
        <nav class="chrome-menu" aria-label="应用菜单">
          <div v-for="menu in chromeMenus" :key="menu" class="chrome-menu-item">
            <button type="button" @click="handleChromeMenu(menu)">{{ menu }}</button>
            <div v-if="menu === '帮助' && showHelpMenu" class="chrome-dropdown">
              <button type="button" @click="openOperationGuide">操作说明</button>
              <button type="button" @click="openVersionInfo">版本信息</button>
            </div>
          </div>
        </nav>
      </div>

      <div class="chrome-center">
        <span>{{ project?.name || '抽题助手' }}</span>
      </div>

      <div v-if="!isMac" class="chrome-window-controls">
        <button type="button" title="最小化" @click="minimizeWindow">
          <span aria-hidden="true" class="window-minimize"></span>
        </button>
        <button type="button" title="最大化" @click="toggleMaximizeWindow">
          <span aria-hidden="true" class="window-maximize"></span>
        </button>
        <button class="chrome-close" type="button" title="关闭" @click="closeWindow">
          <SvgIcon :src="icons.x" />
        </button>
      </div>
    </header>

    <div class="app-content">
      <ProjectHome
        v-if="activeView === 'home'"
        :projects="projects"
        @create-project="createProject"
        @delete-project="deleteProject"
        @open-project="openProject"
        @open-settings="openSettings"
      />

      <ActivityPanel
        v-else-if="activeView === 'activity'"
        :activity="activity"
        :activity-progress="activityProgress"
        :answer-text="answerText"
        :completed-questions="completedQuestions"
        :current-question="currentQuestion"
        :elapsed-time="elapsedTime"
        :format-date="formatDate"
        :format-timer="formatTimer"
        :selected-questions-count="selectedQuestions.length"
        :timer-dash-offset="timerDashOffset"
        @back="backToWorkspaceFromActivity"
        @finish="finishActivity"
        @next="drawNextQuestion"
        @pause="pauseTimer"
        @reset="resetTimer"
        @resume="resumeTimer"
        @reveal="revealAnswer"
        @start="startActivity"
      />

      <FinishView
        v-else-if="activeView === 'finish'"
        :answer-text="answerText"
        :completed-questions="completedQuestions"
        :elapsed-time="elapsedTime()"
        :project="project"
        @home="backHome"
        @retry="startActivity"
      />

      <div v-else-if="activeView === 'settings'" class="settings-view">
        <header class="figma-header">
          <div class="header-left">
            <button class="icon-button" type="button" @click="activeView = 'home'">←</button>
            <strong>设置</strong>
          </div>
        </header>
        <main class="settings-main">
          <SettingsPanel
            :project="project"
            @export-backup="exportBackup"
            @import-file="handleImportFile"
            @play-sound="playSound"
            @sound-file="handleSoundFile"
            @stop-sound="stopSound"
            @touch="touchProject"
          />
          <p class="app-version">抽题助手 v1.0.0 · 纯离线运行 · 数据存储在本地</p>
        </main>
      </div>

      <div v-else-if="activeView === 'help'" class="help-view">
        <header class="figma-header">
          <div class="header-left">
            <button class="icon-button" type="button" @click="activeView = 'home'">←</button>
            <strong>操作说明</strong>
          </div>
        </header>
        <main class="help-main">
          <OperationGuide />
        </main>
      </div>

      <div v-else-if="activeView === 'version'" class="help-view">
        <header class="figma-header">
          <div class="header-left">
            <button class="icon-button" type="button" @click="activeView = 'home'">←</button>
            <strong>版本信息</strong>
          </div>
        </header>
        <main class="version-main">
          <VersionInfo />
        </main>
      </div>

      <div v-else class="app-shell">
        <AppSidebar
          v-model:active-project-id="activeProjectId"
          v-model:active-tab="activeTab"
          :data-path="dataPath"
          :projects="projects"
          :tabs="tabs"
          @create-project="createProject"
          @project-changed="resetActivity"
        />

        <main class="workspace">
          <AppTopbar
            :notice="notice"
            :project="project"
            :selected-questions-count="selectedQuestions.length"
            @back-home="backHome"
            @delete-project="deleteProject"
            @export-backup="exportBackup"
            @save="touchProject()"
            @start-activity="startActivity"
          />

          <ProjectPanel
            v-if="activeTab === 'project'"
            :activity-ready-items="activityReadyItems"
            :import-ready="importReady"
            :project="project"
            :selected-question-rate="selectedQuestionRate"
            :selected-questions-count="selectedQuestions.length"
            @touch="touchProject"
          />

          <QuestionTypePanel
            v-if="activeTab === 'types'"
            :base-type-labels="baseTypeLabels"
            :project="project"
            :type-draft="typeDraft"
            @add-type="addType"
            @remove-type="removeType"
            @toggle-difficulty="toggleTypeDifficulty"
            @touch="touchProject"
          />

          <DifficultyPanel
            v-if="activeTab === 'difficulties'"
            :difficulty-draft="difficultyDraft"
            :project="project"
            @add-difficulty="addDifficulty"
            @move-difficulty="moveDifficulty"
            @remove-difficulty="removeDifficulty"
            @touch="touchProject"
          />

          <CountdownPanel
            v-if="activeTab === 'countdown'"
            :base-type-labels="baseTypeLabels"
            :project="project"
            @touch="touchProject"
          />

          <ImportPanel
            v-if="activeTab === 'import'"
            :import-batch="importBatch"
            v-model:import-encoding="importEncoding"
            :import-rows="importRows"
            :import-valid-count="importValidCount"
            @confirm-import="confirmImport"
            @export-template="exportTemplate"
            @import-file="handleImportFile"
          />

          <QuestionManagePanel
            v-if="activeTab === 'questions'"
            :answer-text="answerText"
            :base-type-labels="baseTypeLabels"
            :filtered-questions="filteredQuestions"
            :filters="filters"
            :project="project"
            @bulk-enabled="bulkEnabled"
            @bulk-select="bulkSelect"
            @delete-filtered-questions="deleteFilteredQuestions"
            @touch="touchProject"
          />
        </main>
      </div>

      <NewProjectModal v-if="showNewProjectModal" @close="showNewProjectModal = false" @create="confirmCreateProject" />
    </div>
  </div>
</template>
