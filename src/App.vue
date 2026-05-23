<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import * as XLSX from 'xlsx'

type BaseQuestionType = 'single' | 'multiple' | 'trueFalse' | 'shortAnswer'
type ThemeName = 'monochrome' | 'colorful'
type ActivityStatus = 'idle' | 'running' | 'paused' | 'finished'
type ImportEncoding = 'auto' | 'utf-8' | 'utf-16le' | 'utf-16be' | 'gb18030'

interface QuestionTypeConfig {
  id: string
  name: string
  baseType: BaseQuestionType
  enabled: boolean
  difficultyIds: string[]
  countdownSeconds: number
  createdAt: string
  updatedAt: string
}

interface DifficultyConfig {
  id: string
  name: string
  order: number
  enabled: boolean
  createdAt: string
  updatedAt: string
}

interface QuestionOption {
  id: string
  label?: string
  content: string
  order: number
}

interface Question {
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

interface Project {
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

interface ImportRow {
  row: number
  question?: Question
  errors: string[]
}

const baseTypeLabels: Record<BaseQuestionType, string> = {
  single: '单选题',
  multiple: '多选题',
  trueFalse: '判断题',
  shortAnswer: '简答题',
}

const tabs = [
  { id: 'project', label: '项目信息' },
  { id: 'types', label: '题型设置' },
  { id: 'difficulties', label: '难度设置' },
  { id: 'countdown', label: '倒计时' },
  { id: 'import', label: '题目导入' },
  { id: 'questions', label: '题目管理' },
  { id: 'activity', label: '活动运行' },
  { id: 'settings', label: '设置备份' },
] as const

type TabId = (typeof tabs)[number]['id']

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

const makeProject = (): Project => {
  const timestamp = now()
  const difficulties = ['简单', '中等', '困难'].map(makeDifficulty)
  const difficultyIds = difficulties.map((difficulty) => difficulty.id)
  return {
    id: uid('project'),
    name: '我的抽题活动',
    description: '用于课堂、培训或现场问答的离线抽题项目。',
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

const normalizeProjects = (value: unknown): Project[] => {
  if (!Array.isArray(value) || !value.length) return [makeProject()]
  return value as Project[]
}

const projects = ref<Project[]>([makeProject()])
const activeProjectId = ref(projects.value[0]?.id ?? '')
const activeTab = ref<TabId>('project')
const notice = ref('项目正在载入，本机 SQLite 会保存所有项目数据。')
const isHydrated = ref(false)
const dataPath = ref('')
const typeDraft = reactive({ name: '', baseType: 'single' as BaseQuestionType, countdownSeconds: 30 })
const difficultyDraft = reactive({ name: '' })
const importEncoding = ref<ImportEncoding>('auto')
const importRows = ref<ImportRow[]>([])
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

const project = computed(() => projects.value.find((item) => item.id === activeProjectId.value) ?? projects.value[0])
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
  const nextProject = makeProject()
  projects.value.unshift(nextProject)
  activeProjectId.value = nextProject.id
  activeTab.value = 'project'
  resetActivity()
  notice.value = '已创建新项目。'
}

function deleteProject(id: string) {
  if (projects.value.length === 1) {
    notice.value = '至少需要保留一个项目。'
    return
  }
  if (!window.confirm('确认删除这个项目吗？此操作不可恢复。')) return
  projects.value = projects.value.filter((item) => item.id !== id)
  activeProjectId.value = projects.value[0]?.id ?? ''
  resetActivity()
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
  const headers = ['题目ID', '题型', '基础题型', '难度', '题干', '选项', '正确答案', '解析', '是否启用', '标签', '备注']
  const sampleType = enabledTypes.value[0]
  const sampleDifficulty = enabledDifficulties.value[0]
  const rows = [
    headers,
    [
      '',
      sampleType?.name ?? '理论单选',
      sampleType ? baseTypeLabels[sampleType.baseType] : '单选题',
      sampleDifficulty?.name ?? '简单',
      '以下哪些能力属于离线抽题软件？',
      '["项目保存","随机抽题","倒计时","云端登录"]',
      '项目保存;随机抽题;倒计时',
      '本题演示 JSON 数组选项和分号答案。',
      '是',
      '示例;培训',
      '可删除示例行后填写正式题目',
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
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim())
  const headers = splitDelimitedLine(lines[0] ?? '', delimiter)
  const rows = lines.slice(1)
  return rows.map((line, index) => buildImportRow(splitDelimitedLine(line, delimiter), headers, index + 2))
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
  const answer = parseAnswer(valueOf('正确答案'), type?.baseType)
  if (type && type.baseType !== 'shortAnswer' && type.baseType !== 'trueFalse' && rawOptions.length < 2) errors.push('单选/多选题至少需要 2 个选项')
  if (type?.baseType === 'single' && Array.isArray(answer) && answer.length !== 1) errors.push('单选题只能有 1 个正确答案')
  if (type?.baseType === 'multiple' && (!Array.isArray(answer) || answer.length < 1)) errors.push('多选题至少需要 1 个正确答案')
  if (type?.baseType === 'trueFalse' && !['正确', '错误', '是', '否', 'true', 'false'].includes(answerText(answer).toLowerCase())) errors.push('判断题答案不合法')
  if (type?.baseType === 'shortAnswer' && !answerText(answer)) errors.push('简答题答案不能为空')

  const optionTexts = rawOptions.map((item) => item.content)
  const answers = Array.isArray(answer) ? answer : [answer]
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
          answer,
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

function parseAnswer(input: string, baseType?: BaseQuestionType): string | string[] {
  const normalized = input.trim()
  if (baseType === 'multiple') {
    try {
      const parsed = JSON.parse(normalized) as unknown
      if (Array.isArray(parsed)) return parsed.map(String)
    } catch {
      // Fall back to delimiter parsing below.
    }
    return splitList(normalized)
  }
  if (baseType === 'single') return splitList(normalized)[0] ?? normalized
  return normalized
}

function splitList(value: string) {
  return value
    .split(/[;；、|]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function splitDelimitedLine(line: string, delimiter: ',' | '\t') {
  const result: string[] = []
  let current = ''
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]
    if (char === '"' && next === '"') {
      current += '"'
      index += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === delimiter && !quoted) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
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
  activity.answerVisible = true
  stopSound()
}

function finishActivity() {
  window.clearInterval(timer)
  stopSound()
  activity.status = 'finished'
  activity.finishedAt = now()
  activity.currentQuestionId = ''
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
    const backup = JSON.parse(await file.text()) as { project?: Project }
    if (!backup.project?.id) throw new Error('Invalid backup')
    const incoming = backup.project
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
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <span class="mark">Q</span>
        <div>
          <strong>抽题工作台</strong>
          <small>离线活动管理</small>
        </div>
      </div>

      <label class="field">
        <span>当前项目</span>
        <select v-model="activeProjectId" @change="resetActivity">
          <option v-for="item in projects" :key="item.id" :value="item.id">{{ item.name }}</option>
        </select>
      </label>

      <button class="primary full" type="button" @click="createProject">新建项目</button>

      <nav>
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </nav>
    </aside>

    <main class="workspace">
      <header class="topbar">
        <div>
          <h1>{{ project.name }}</h1>
          <p>{{ notice }}</p>
        </div>
        <div class="top-actions">
          <button type="button" @click="touchProject()">保存</button>
          <button type="button" @click="exportBackup">导出备份</button>
          <button class="danger" type="button" @click="deleteProject(project.id)">删除项目</button>
        </div>
      </header>

      <section v-if="activeTab === 'project'" class="panel">
        <div class="section-title">
          <h2>项目配置</h2>
          <p>基础信息会随题型、题库、主题和音效一起保存。</p>
        </div>
        <div class="form-grid">
          <label class="field">
            <span>项目名称</span>
            <input v-model.trim="project.name" type="text" @change="touchProject('已更新项目名称。')" />
          </label>
          <label class="field">
            <span>创建时间</span>
            <input :value="formatDate(project.createdAt)" type="text" readonly />
          </label>
          <label class="field wide">
            <span>项目描述</span>
            <textarea v-model.trim="project.description" rows="4" @change="touchProject('已更新项目描述。')" />
          </label>
        </div>
        <div class="stats">
          <strong>{{ project.questionTypes.length }}</strong><span>题型</span>
          <strong>{{ project.difficulties.length }}</strong><span>难度</span>
          <strong>{{ project.questions.length }}</strong><span>题目</span>
          <strong>{{ selectedQuestions.length }}</strong><span>参与抽取</span>
        </div>
      </section>

      <section v-if="activeTab === 'types'" class="panel">
        <div class="section-title">
          <h2>题型设置</h2>
          <p>展示名称可自定义，业务规则仍绑定到基础题型。</p>
        </div>
        <div class="inline-form">
          <input v-model.trim="typeDraft.name" type="text" placeholder="自定义题型名称" />
          <select v-model="typeDraft.baseType">
            <option v-for="(label, value) in baseTypeLabels" :key="value" :value="value">{{ label }}</option>
          </select>
          <input v-model.number="typeDraft.countdownSeconds" min="5" max="3600" type="number" />
          <button class="primary" type="button" @click="addType">新增题型</button>
        </div>
        <div class="table">
          <div class="table-row head">
            <span>启用</span><span>题型名称</span><span>基础题型</span><span>可用难度</span><span>倒计时</span><span>操作</span>
          </div>
          <div v-for="item in project.questionTypes" :key="item.id" class="table-row">
            <label><input v-model="item.enabled" type="checkbox" @change="touchProject('已更新题型状态。')" /></label>
            <input v-model.trim="item.name" type="text" @change="touchProject('已更新题型名称。')" />
            <select v-model="item.baseType" @change="touchProject('已更新基础题型。')">
              <option v-for="(label, value) in baseTypeLabels" :key="value" :value="value">{{ label }}</option>
            </select>
            <div class="chips">
              <label v-for="difficulty in project.difficulties" :key="difficulty.id" class="chip">
                <input
                  :checked="item.difficultyIds.includes(difficulty.id)"
                  type="checkbox"
                  @change="toggleTypeDifficulty(item, difficulty.id)"
                />
                {{ difficulty.name }}
              </label>
            </div>
            <input
              v-model.number="item.countdownSeconds"
              min="5"
              max="3600"
              type="number"
              @change="touchProject('已更新题型倒计时。')"
            />
            <button type="button" @click="removeType(item.id)">删除</button>
          </div>
        </div>
      </section>

      <section v-if="activeTab === 'difficulties'" class="panel">
        <div class="section-title">
          <h2>难度设置</h2>
          <p>难度可排序，导入题目时必须匹配已有难度。</p>
        </div>
        <div class="inline-form">
          <input v-model.trim="difficultyDraft.name" type="text" placeholder="难度名称" />
          <button class="primary" type="button" @click="addDifficulty">新增难度</button>
        </div>
        <div class="list">
          <div v-for="(item, index) in project.difficulties" :key="item.id" class="list-item">
            <label><input v-model="item.enabled" type="checkbox" @change="touchProject('已更新难度状态。')" /> 启用</label>
            <input v-model.trim="item.name" type="text" @change="touchProject('已更新难度名称。')" />
            <span>排序 {{ item.order }}</span>
            <button type="button" @click="moveDifficulty(index, -1)">上移</button>
            <button type="button" @click="moveDifficulty(index, 1)">下移</button>
            <button type="button" @click="removeDifficulty(item.id)">删除</button>
          </div>
        </div>
      </section>

      <section v-if="activeTab === 'countdown'" class="panel">
        <div class="section-title">
          <h2>倒计时配置</h2>
          <p>每种自定义题型拥有独立倒计时，活动抽题后自动读取。</p>
        </div>
        <div class="countdown-grid">
          <label v-for="item in project.questionTypes" :key="item.id" class="count-card">
            <span>{{ item.name }}</span>
            <small>{{ baseTypeLabels[item.baseType] }}</small>
            <input
              v-model.number="item.countdownSeconds"
              min="5"
              max="3600"
              type="number"
              @change="touchProject('已保存倒计时配置。')"
            />
          </label>
        </div>
      </section>

      <section v-if="activeTab === 'import'" class="panel">
        <div class="section-title">
          <h2>题目导入</h2>
          <p>支持 CSV/TSV 表格、UTF-8/UTF-16 文本识别和 JSON 备份恢复。</p>
        </div>
        <div class="toolbar">
          <button class="primary" type="button" @click="exportTemplate">生成导入模板</button>
          <label class="file-button">
            导入题目或备份
            <input accept=".csv,.tsv,.json,.xlsx,.xls" type="file" @change="handleImportFile" />
          </label>
          <select v-model="importEncoding">
            <option value="auto">自动识别编码</option>
            <option value="utf-8">UTF-8</option>
            <option value="utf-16le">UTF-16LE</option>
            <option value="utf-16be">UTF-16BE</option>
            <option value="gb18030">GBK / GB18030</option>
          </select>
          <button :disabled="!importValidCount" type="button" @click="confirmImport">确认导入 {{ importValidCount }} 道</button>
        </div>
        <div v-if="importRows.length" class="import-preview">
          <div v-for="row in importRows" :key="row.row" :class="['preview-row', { invalid: row.errors.length }]">
            <strong>第 {{ row.row }} 行</strong>
            <span>{{ row.question?.content || '未生成题目' }}</span>
            <small>{{ row.errors.length ? row.errors.join('；') : '校验通过' }}</small>
          </div>
        </div>
      </section>

      <section v-if="activeTab === 'questions'" class="panel">
        <div class="section-title">
          <h2>题目管理</h2>
          <p>只有已选择且启用的题目会进入随机抽取池。</p>
        </div>
        <div class="filters">
          <input v-model.trim="filters.keyword" type="search" placeholder="关键词搜索" />
          <select v-model="filters.typeId">
            <option value="all">全部题型</option>
            <option v-for="item in project.questionTypes" :key="item.id" :value="item.id">{{ item.name }}</option>
          </select>
          <select v-model="filters.difficultyId">
            <option value="all">全部难度</option>
            <option v-for="item in project.difficulties" :key="item.id" :value="item.id">{{ item.name }}</option>
          </select>
          <select v-model="filters.selected">
            <option value="all">选择状态</option>
            <option value="true">已选择</option>
            <option value="false">未选择</option>
          </select>
          <select v-model="filters.enabled">
            <option value="all">启用状态</option>
            <option value="true">已启用</option>
            <option value="false">已禁用</option>
          </select>
          <input v-model.trim="filters.tag" type="search" placeholder="标签" />
        </div>
        <div class="toolbar">
          <button type="button" @click="bulkSelect('allFiltered')">全选筛选结果</button>
          <button type="button" @click="bulkSelect('invert')">反选</button>
          <button type="button" @click="bulkSelect('none')">取消全选</button>
          <button type="button" @click="bulkEnabled(true)">批量启用</button>
          <button type="button" @click="bulkEnabled(false)">批量禁用</button>
          <button class="danger" type="button" @click="deleteFilteredQuestions">批量删除</button>
        </div>
        <div class="question-list">
          <article v-for="question in filteredQuestions" :key="question.id" class="question-card">
            <div class="question-meta">
              <label><input v-model="question.selected" type="checkbox" @change="touchProject('已更新选择状态。')" /> 参与</label>
              <label><input v-model="question.enabled" type="checkbox" @change="touchProject('已更新启用状态。')" /> 启用</label>
              <span>{{ question.customTypeName }}</span>
              <span>{{ baseTypeLabels[question.baseType] }}</span>
              <span>{{ question.difficultyName }}</span>
              <span>{{ question.tags.join('、') || '无标签' }}</span>
            </div>
            <h3>{{ question.content }}</h3>
            <ol v-if="question.options.length">
              <li v-for="option in question.options" :key="option.id">{{ option.content }}</li>
            </ol>
            <p>答案：{{ answerText(question.answer) }}</p>
          </article>
          <div v-if="!filteredQuestions.length" class="empty">暂无题目，请先导入。</div>
        </div>
      </section>

      <section v-if="activeTab === 'activity'" class="activity-panel">
        <div class="activity-header">
          <div>
            <h2>活动运行</h2>
            <p>{{ selectedQuestions.length }} 道题已进入抽取池</p>
          </div>
          <button v-if="activity.status === 'idle' || activity.status === 'finished'" class="primary" type="button" @click="startActivity">
            开始抽题
          </button>
          <button v-else class="danger" type="button" @click="finishActivity">结束活动</button>
        </div>

        <div v-if="activity.status === 'finished'" class="finish">
          <h3>活动结束</h3>
          <p>总题数 {{ activity.completedQuestionIds.length }}，用时 {{ elapsedTime() }}</p>
          <p>开始 {{ formatDate(activity.startedAt) }}，结束 {{ formatDate(activity.finishedAt) }}</p>
        </div>

        <div v-else-if="currentQuestion" class="stage">
          <div class="stage-meta">
            <span>进度 {{ activity.completedQuestionIds.length }}/{{ activity.completedQuestionIds.length + activity.remainingQuestionIds.length }}</span>
            <span>{{ currentQuestion.customTypeName }}</span>
            <span>{{ currentQuestion.difficultyName }}</span>
          </div>
          <h3>{{ currentQuestion.content }}</h3>
          <ol v-if="currentQuestion.options.length">
            <li v-for="option in currentQuestion.options" :key="option.id">{{ option.content }}</li>
          </ol>
          <div :class="['timer', { ended: activity.currentCountdownSeconds === 0 }]">{{ formatTimer(activity.currentCountdownSeconds) }}</div>
          <div class="activity-actions">
            <button type="button" @click="pauseTimer">暂停</button>
            <button type="button" @click="resumeTimer">继续</button>
            <button type="button" @click="resetTimer">重置</button>
            <button class="primary" type="button" @click="revealAnswer">显示正确答案</button>
            <button type="button" @click="drawNextQuestion">下一题</button>
          </div>
          <div v-if="activity.answerVisible" class="answer">
            <strong>正确答案：{{ answerText(currentQuestion.answer) }}</strong>
            <p v-if="currentQuestion.analysis">解析：{{ currentQuestion.analysis }}</p>
            <p v-if="currentQuestion.remark">备注：{{ currentQuestion.remark }}</p>
          </div>
        </div>

        <div v-else class="empty">点击开始后，系统会从已选择且启用的题目中随机抽取。</div>
      </section>

      <section v-if="activeTab === 'settings'" class="panel">
        <div class="section-title">
          <h2>主题与音效</h2>
          <p>主题实时预览；倒计时结束会播放默认或自定义提示音。</p>
        </div>
        <div class="settings-grid">
          <div class="setting-block">
            <h3>主题</h3>
            <div class="segmented">
              <button
                type="button"
                :class="{ active: project.themeConfig.currentTheme === 'monochrome' }"
                @click="project.themeConfig.currentTheme = 'monochrome'; touchProject('已切换为黑白简约主题。')"
              >
                黑白简约
              </button>
              <button
                type="button"
                :class="{ active: project.themeConfig.currentTheme === 'colorful' }"
                @click="project.themeConfig.currentTheme = 'colorful'; touchProject('已切换为彩色主题。')"
              >
                彩色风格
              </button>
            </div>
          </div>
          <div class="setting-block">
            <h3>音效</h3>
            <label class="file-button">
              选择本地音效
              <input accept=".mp3,.wav,.ogg" type="file" @change="handleSoundFile" />
            </label>
            <label class="field">
              <span>音量</span>
              <input v-model.number="project.soundConfig.volume" max="1" min="0" step="0.05" type="range" @change="touchProject('已保存音量。')" />
            </label>
            <label><input v-model="project.soundConfig.loop" type="checkbox" @change="touchProject('已保存循环播放设置。')" /> 循环播放</label>
            <div class="toolbar">
              <button type="button" @click="project.soundConfig.type = 'default'; touchProject('已恢复默认音效。')">恢复默认</button>
              <button type="button" @click="playSound">试听</button>
              <button type="button" @click="stopSound">停止</button>
            </div>
          </div>
          <div class="setting-block">
            <h3>备份</h3>
            <div class="toolbar">
              <button class="primary" type="button" @click="exportBackup">导出 JSON 备份</button>
              <label class="file-button">
                导入 JSON 备份
                <input accept=".json" type="file" @change="handleImportFile" />
              </label>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>
