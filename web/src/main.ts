import './style.css'
import { App } from './app'
import { createStorage } from './storage'

const root = document.getElementById('app')!
new App(root, createStorage()).boot()
