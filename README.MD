## 🔗 Линк към live сайта:

https://questure-eight.vercel.app

# Questionture

Questionture е location-based side quest app, в което изпълняваш реални предизвикателства, качваш снимки като доказателство и трупаш XP. Можеш да играеш сам или с приятели, да откриваш куестове около теб и да се катериш в leaderboard-а. Проектът е създаден като училищен проект с цел да накара хората да оставят телефона и да излязат навън.

---

# 🎮 Какво представлява?

Questionture комбинира game mechanics с реалния свят — нещо между geocaching, Pokémon GO и Duolingo.

## Основни функции:

* 🗺️ Голям избор от куестове
* 👥 Squad система с XP бонуси
* 📸 Качване на снимки като доказателство
* 🏆 XP, leveling и leaderboard
* 🤖 AI-generated quest ideas (планирано, ама още го мислим)
* 📱 PWA support за мобилни устройства

---

# 🚀 Quick Start

## Изисквания

* Node.js v18+
* MongoDB Atlas акаунт (или локална MongoDB, ама това е леко кофти)
* Cloudinary акаунт

## Инсталация

### Clone на repository-то

```bash
git clone https://github.com/IT-8-TUES/8B-25-26-Random-Otbor.git
cd 8B-25-26-Random-Otbor
```

### Backend setup

```bash
cd backend
npm install
```

### Environment variables

Създай `.env` файл в `backend/`:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
PORT=3000
```

### Стартиране на backend-а

```bash
npm start
```

### Frontend setup

```bash
cd ../frontend
npx http-server -p 5000
```

ИЛИ бъди нормален човек и използвай liveserver

## Достъп

Frontend: `http://localhost:5000`
Backend API: `http://localhost:3000`

---

# 📁 Структура на проекта

```txt
questionture/
├── frontend/
│   ├── index.html
│   ├── css/
│   ├── js/
│   ├── pages/
│   └── favicon.png/
│
├── backend/
│   ├── index.js
│   ├── seed_quest.js
│   ├── node_modules/
│   ├── .gitignore
│   ├── .env
│   ├── package-lock.json
│   └── package.json
│
└── README.md
```

---

# 🛠️ Tech Stack

## Frontend

* Vanilla HTML / CSS / JS
* AwesomeIcons
* PWA support

## Backend

* Node.js + Express
* MongoDB + Mongoose
* JWT Authentication
* Cloudinary
* Multer

## Deployment

* Frontend: GitHub Pages
* Backend: Render
* Database: MongoDB Atlas

---

# 🤝 Contributing

Проектът е училищен, но contributions са добре дошли.

1. Fork на repo-то
2. Създай branch:

```bash
git checkout -b feature/amazing-feature
```

3. Commit:

```bash
git commit -m "Add amazing feature"
```

4. Push:

```bash
git push origin feature/amazing-feature
```

5. Open Pull Request

---

# 🐛 Known Issues

* [ ] Няма preview на снимките преди upload
* [ ] Friend requests все още свестни нямат notifications
* [ ] Липсва rate limiting
* [ ] XP system няма streak bonuses
* [ ] Map view все още не е имплементиран
* [ ] AI Quest Generation също още не е имплементиран

---

# 🙏 Благодарности

* Fonts: Press Start 2P, Nunito
* Icons: AwesomeIcons
* Inspiration: Geocaching, Pokémon GO, Foursquare и всеки приятел, който е казвал:

> “брат айде да излезем някъде”

---

# 📬 Контакт

Създаден от Дамян Добринов, Боян Николов, Юрий Беляков и ChatGPT като училищен проект.

GitHub: @Supermyskin - Дамян
Email: [supermyskin@abv.bg](mailto:your.email@example.com)
Instagram: [@supermyskin.official](https://www.instagram.com/supermyskin.official/)

GitHub: @HackerCatcho - Боян
Email: Анонимен и мисториозен
Instagram: [@yurzzilla](https://www.instagram.com/yurzzilla/)

GitHub: @yurzzilla3000 - Юрий
Email: Същото анонимен и мистериозен
Instagram: [@hackercatcho](https://www.instagram.com/hackercatcho/)

---

Излез навън и трупай XP.
