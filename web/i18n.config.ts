import vi from './locales/vi.json'
import ja from './locales/ja.json'

export default defineI18nConfig(() => ({
  legacy: false,
  locale: 'vi',
  defaultLocale: 'vi',
  messages: {
    vi,
    ja
  }
}))
