import './style.css'
import { App } from './app'
import { createStorage } from './storage'

const root = document.getElementById('app')!
const app = new App(root, createStorage())
app.boot()

// dev only: lets a browser session drive the app (e.g. feed a fake voice transcript)
if (import.meta.env.DEV) (window as unknown as { __app: App }).__app = app
