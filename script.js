const apiUrls = {
  newsdata: "http://81.163.29.77:8080/api/NewsData",
  gnews: "http://81.163.29.77:8080/api/gNews",
  newsapi: "http://81.163.29.77:8080/api/NewsApi",
  topNews: "http://81.163.29.77:8080/api/gNews/getTopNews",
  weather: "http://81.163.29.77:8080/api/getWeather",
  exchangeRates: "http://81.163.29.77:8080/api/getExchangeRates",
}

const CATEGORY_MAP_NEWSDATA = {
  politics: "politics",
  business: "business",
  technology: "technology",
  science: "science",
  sports: "sports",
  entertainment: "entertainment",
}

const CATEGORY_MAP_GNEWS = {
  politics: "world",
  business: "business",
  technology: "technology",
  science: "science",
  sports: "sports",
  entertainment: "entertainment",
}

const CATEGORY_MAP_NEWSAPI = {
  politics: "politics",
  business: "business",
  technology: "technology",
  science: "science",
  sports: "sports",
  entertainment: "entertainment",
}

const newsContainer = document.getElementById("news-container")
const bestNews = document.getElementById("best-news")
const trendingContainer = document.getElementById("trending-container")
const featuredTitle = document.getElementById("featured-title")
const featuredBtn = document.getElementById("featured-btn")
const weatherInfo = document.getElementById("weather-info")
const dynamicSectionTitle = document.getElementById("dynamic-section-title")
const featuredSource = document.getElementById("featured-source")
const featuredTime = document.getElementById("featured-time")
const featuredTags = document.getElementById("featured-tags")

let currentSection = "all"
let selectedSources = ["mixed"]
let allNewsData = []
let topNewsData = []
let featuredNewsIndex = 0
let featuredNewsArray = []
let userCity = null
let currentCategory = ""
let isSearchMode = false
let searchKeywords = ""

let currentTrendingPage = 0
const trendingItemsPerPage = 8

let searchDebounceTimer = null

setInterval(
  () => {
    if (!isSearchMode && !currentCategory) {
      loadNews()
    }
  },
  15 * 60 * 1000,
)

setInterval(
  () => {
    if (isWeatherWidgetOnPage()) {
      loadWeather()
    }
  },
  15 * 60 * 1000,
)

setInterval(
  () => {
    if (isExchangeWidgetOnPage()) {
      loadExchangeRates()
    }
  },
  15 * 60 * 1000,
)

setInterval(() => {
  rotateFeaturedNews()
}, 8000)

const navMenuBtns = document.querySelectorAll(".nav-menu-btn")
const navSearch = document.getElementById("nav-search")

navMenuBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    navMenuBtns.forEach((b) => b.classList.remove("active"))
    btn.classList.add("active")
    currentSection = btn.dataset.section
    isSearchMode = false

    if (currentSection === "all") {
      selectedSources = ["mixed"]
    } else if (["newsdata", "gnews", "newsapi"].includes(currentSection)) {
      selectedSources = [currentSection]
    }

    updateSectionTitle(currentSection)

    if (currentCategory) {
      loadNewsByCategory(currentCategory)
    } else {
      loadNews()
    }
  })
})

navSearch.addEventListener("input", (e) => {
  clearTimeout(searchDebounceTimer)
  const searchText = e.target.value.trim()

  if (searchText.length >= 2) {
    searchDebounceTimer = setTimeout(() => {
      performSearch(searchText)
    }, 800)
  } else if (searchText.length === 0) {
    isSearchMode = false
    currentSection = "all"
    navMenuBtns.forEach((b) => b.classList.remove("active"))
    navMenuBtns[0].classList.add("active")
    loadNews()
  }
})

navSearch.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    clearTimeout(searchDebounceTimer)
    const searchText = navSearch.value.trim()
    if (searchText.length >= 2) {
      performSearch(searchText)
    }
  }
})

async function performSearch(searchText) {
  if (searchText.length >= 2) {
    isSearchMode = true
    searchKeywords = searchText
    currentCategory = ""

    try {
      showLoading()

      const keywords = searchText.split(/\s+/).filter((kw) => kw.trim() !== "")
      const queryParams = keywords.map((kw) => `keywords=${encodeURIComponent(kw)}`).join("&")

      console.log("[v0] Search text:", searchText)
      console.log("[v0] Keywords array:", keywords)
      console.log("[v0] Selected sources:", selectedSources)

      let allSearchResults = []

      if (selectedSources.includes("mixed")) {
        // Search all sources
        for (const source of ["newsdata", "gnews", "newsapi"]) {
          try {
            const url = `${apiUrls[source]}/search?${queryParams}`
            console.log(`[v0] Search URL for ${source}:`, url)

            const response = await fetch(url)
            if (!response.ok) {
              console.warn(`Search failed for ${source}: ${response.status}`)
              continue
            }

            const newsData = await response.json()
            let newsArray = []
            if (newsData && typeof newsData === "object") {
              newsArray = Object.values(newsData).flat()
            }

            newsArray = newsArray
              .filter((item) => item && item.title && item.description)
              .map((item) => ({
                ...item,
                source: source,
                title: item.title || item.headline || "Без названия",
                description: item.description || item.content || item.summary || "",
                image_url: item.image_url || item.image || item.urlToImage || "",
                link: item.link || item.url || "#",
                date: item.date || item.publishedAt || new Date().toISOString(),
              }))

            console.log(`[v0] Found ${newsArray.length} results from ${source}`)
            allSearchResults.push(...newsArray)
          } catch (error) {
            console.error(`Error searching ${source}:`, error)
          }
        }
      } else {
        // Search only selected source
        const source = selectedSources[0]
        try {
          const url = `${apiUrls[source]}/search?${queryParams}`
          console.log(`[v0] Search URL for ${source}:`, url)

          const response = await fetch(url)
          if (!response.ok) throw new Error(`Ошибка HTTP: ${response.status}`)

          const newsData = await response.json()
          let newsArray = []
          if (newsData && typeof newsData === "object") {
            newsArray = Object.values(newsData).flat()
          }

          newsArray = newsArray
            .filter((item) => item && item.title && item.description)
            .map((item) => ({
              ...item,
              source: source,
              title: item.title || item.headline || "Без названия",
              description: item.description || item.content || item.summary || "",
              image_url: item.image_url || item.image || item.urlToImage || "",
              link: item.link || item.url || "#",
              date: item.date || item.publishedAt || new Date().toISOString(),
            }))

          console.log(`[v0] Found ${newsArray.length} results from ${source}`)
          allSearchResults = newsArray
        } catch (error) {
          console.error(`Error searching ${source}:`, error)
        }
      }

      // Remove duplicates by link
      const uniqueResults = []
      const seenLinks = new Set()
      for (const item of allSearchResults) {
        if (!seenLinks.has(item.link)) {
          seenLinks.add(item.link)
          uniqueResults.push(item)
        }
      }

      uniqueResults.sort((a, b) => {
        const dateA = new Date(a.date || a.publishedAt || 0)
        const dateB = new Date(b.date || b.publishedAt || 0)
        return dateB - dateA
      })

      console.log("[v0] Total unique search results:", uniqueResults.length)

      if (uniqueResults.length === 0) {
        newsContainer.innerHTML = '<div class="loading">Новости не найдены</div>'
        return
      }

      allNewsData = uniqueResults
      updateSectionTitle("search")
      displayNews(uniqueResults)

      // Update trending section with search results
      currentTrendingPage = 0
      displayTrendingNews()
    } catch (error) {
      console.error("Ошибка поиска:", error)
      newsContainer.innerHTML = '<div class="loading">Не удалось выполнить поиск</div>'
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const topicTags = document.querySelectorAll(".topic-tag")

  topicTags.forEach((tag) => {
    tag.addEventListener("click", function () {
      const category = this.dataset.category

      topicTags.forEach((t) => t.classList.remove("active"))
      this.classList.add("active")

      currentCategory = category
      isSearchMode = false

      loadNewsByCategory(category)
    })
  })

  const burgerMenu = document.getElementById("burger-menu")
  const navMenu = document.getElementById("nav-menu")
  const searchContainer = document.querySelector(".search-container-nav")

  const newsMain = document.querySelector(".news-main")
  const scrollIndicator = document.querySelector(".scroll-indicator")

  if (newsMain && scrollIndicator) {
    newsMain.addEventListener("scroll", () => {
      if (newsMain.scrollTop > 100) {
        scrollIndicator.classList.add("hidden")
      } else {
        scrollIndicator.classList.remove("hidden")
      }
    })
  }

  const navPrev = document.querySelector(".nav-prev")
  const navNext = document.querySelector(".nav-next")

  if (navPrev) {
    navPrev.addEventListener("click", () => {
      if (currentTrendingPage > 0) {
        currentTrendingPage--
        displayTrendingNews()
        scrollToTrendingSection()
      }
    })
  }

  if (navNext) {
    navNext.addEventListener("click", () => {
      const startIndex = 20 + (currentTrendingPage + 1) * trendingItemsPerPage
      if (startIndex < allNewsData.length) {
        currentTrendingPage++
        displayTrendingNews()
        scrollToTrendingSection()
      }
    })
  }

  if (burgerMenu && navMenu) {
    burgerMenu.addEventListener("click", () => {
      burgerMenu.classList.toggle("open")
      navMenu.classList.toggle("open")

      if (searchContainer && searchContainer.classList.contains("show")) {
        searchContainer.classList.remove("show")
      }
    })

    const menuButtons = navMenu.querySelectorAll(".nav-menu-btn")
    menuButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        burgerMenu.classList.remove("open")
        navMenu.classList.remove("open")
      })
    })

    document.addEventListener("click", (e) => {
      if (!burgerMenu.contains(e.target) && !navMenu.contains(e.target)) {
        burgerMenu.classList.remove("open")
        navMenu.classList.remove("open")
      }
    })
  }

  const searchIcon = document.querySelector(".search-container-nav i")
  if (searchIcon && window.innerWidth <= 768) {
    searchIcon.addEventListener("click", () => {
      if (searchContainer) {
        searchContainer.classList.toggle("show")

        if (navMenu && navMenu.classList.contains("open")) {
          burgerMenu.classList.remove("open")
          navMenu.classList.remove("open")
        }
      }
    })
  }
})

async function loadNewsByCategory(category) {
  try {
    showLoading()

    let allCategoryNews = []

    if (selectedSources.includes("mixed")) {
      console.log("[v0] Loading category from all sources (mixed mode)")

      const sourcesData = {
        newsdata: [],
        gnews: [],
        newsapi: [],
      }

      // Load category from all sources in parallel
      const loadPromises = ["newsdata", "gnews", "newsapi"].map(async (source) => {
        try {
          let categoryMap
          if (source === "gnews") {
            categoryMap = CATEGORY_MAP_GNEWS
          } else if (source === "newsapi") {
            categoryMap = CATEGORY_MAP_NEWSAPI
          } else {
            categoryMap = CATEGORY_MAP_NEWSDATA
          }

          const mappedCategory = categoryMap[category] || category
          const url = `${apiUrls[source]}/category/${encodeURIComponent(mappedCategory)}`

          console.log(`[v0] Loading category ${category} from ${source}: ${url}`)

          const response = await fetch(url)
          if (!response.ok) {
            console.warn(`Failed to load category from ${source}: ${response.status}`)
            return
          }

          const newsData = await response.json()

          let newsArray = []
          if (newsData && typeof newsData === "object") {
            newsArray = Object.values(newsData).flat()
          }

          newsArray = newsArray
            .filter((item) => item && (item.title || item.headline))
            .map((item) => ({
              ...item,
              source: source,
              title: item.title || item.headline || "Без названия",
              description: item.description || item.content || item.summary || "",
              image_url: item.image_url || item.image || item.urlToImage || "",
              link: item.link || item.url || "#",
              date: item.date || item.publishedAt || new Date().toISOString(),
            }))

          console.log(`[v0] Loaded ${newsArray.length} news from ${source} for category ${category}`)
          sourcesData[source] = newsArray
        } catch (error) {
          console.error(`Error loading category from ${source}:`, error)
          sourcesData[source] = []
        }
      })

      await Promise.all(loadPromises)

      // Interleave news from all sources
      const maxLength = Math.max(sourcesData.newsdata.length, sourcesData.gnews.length, sourcesData.newsapi.length)

      for (let i = 0; i < maxLength; i++) {
        if (sourcesData.newsdata[i]) allCategoryNews.push(sourcesData.newsdata[i])
        if (sourcesData.gnews[i]) allCategoryNews.push(sourcesData.gnews[i])
        if (sourcesData.newsapi[i]) allCategoryNews.push(sourcesData.newsapi[i])
      }

      console.log(`[v0] Interleaved ${allCategoryNews.length} category news from all sources`)
    } else {
      // Load from selected source only
      const currentSource = selectedSources[0]

      let categoryMap
      if (currentSource === "gnews") {
        categoryMap = CATEGORY_MAP_GNEWS
      } else if (currentSource === "newsapi") {
        categoryMap = CATEGORY_MAP_NEWSAPI
      } else {
        categoryMap = CATEGORY_MAP_NEWSDATA
      }

      const mappedCategory = categoryMap[category] || category
      const url = `${apiUrls[currentSource]}/category/${encodeURIComponent(mappedCategory)}`

      console.log(`[v0] Loading category ${category} from ${currentSource}: ${url}`)

      const response = await fetch(url)
      if (!response.ok) throw new Error(`Ошибка HTTP: ${response.status}`)

      const newsData = await response.json()

      let newsArray = []
      if (newsData && typeof newsData === "object") {
        newsArray = Object.values(newsData).flat()
      }

      newsArray = newsArray
        .filter((item) => item && (item.title || item.headline))
        .map((item) => ({
          ...item,
          source: currentSource,
          title: item.title || item.headline || "Без названия",
          description: item.description || item.content || item.summary || "",
          image_url: item.image_url || item.image || item.urlToImage || "",
          link: item.link || item.url || "#",
          date: item.date || item.publishedAt || new Date().toISOString(),
        }))

      console.log(`[v0] Loaded ${newsArray.length} news from ${currentSource} for category ${category}`)
      allCategoryNews = newsArray
    }

    if (allCategoryNews.length === 0) {
      newsContainer.innerHTML = '<div class="loading">Новости не найдены</div>'
      return
    }

    allNewsData = allCategoryNews
    updateSectionTitle("category")
    displayNews(allCategoryNews)

    // Update trending section with category news
    currentTrendingPage = 0
    displayTrendingNews()
  } catch (error) {
    console.error("Ошибка загрузки категории:", error)
    newsContainer.innerHTML = '<div class="loading">Не удалось загрузить новости категории</div>'
  }
}

async function loadWeather() {
  try {
    if (!userCity) {
      userCity = await getUserCity()
    }

    const response = await fetch(apiUrls.weather)
    if (!response.ok) throw new Error("Failed to load weather")

    const weatherData = await response.json()

    weatherInfo.innerHTML = `
      <div class="weather-location">${weatherData.city || userCity || "Москва"}</div>
      <div class="weather-temp">${weatherData.temperature}°C</div>
      <div class="weather-desc">${weatherData.condition || "Ясно"}</div>
    `
  } catch (error) {
    console.error("Weather error:", error)
    weatherInfo.innerHTML = `
      <div class="weather-location">Погода недоступна</div>
      <div class="weather-temp">--°C</div>
      <div class="weather-desc">Ошибка загрузки</div>
    `
  }
}

async function loadFromSource(source, limit = 250) {
  try {
    const response = await fetch(apiUrls[source])
    if (!response.ok) throw new Error(`Failed to load from ${source}`)

    const data = await response.json()
    let newsArray = []

    if (data && typeof data === "object") {
      newsArray = Object.values(data).flat()
    }

    return newsArray
      .filter((item) => item && (item.title || item.headline))
      .slice(0, limit)
      .map((item) => ({
        ...item,
        source,
        title: item.title || item.headline || "Без названия",
        description: item.description || item.content || item.summary || "",
        image_url: item.image_url || item.image || item.urlToImage || "",
        link: item.link || item.url || "#",
        date: item.date || item.publishedAt || new Date().toISOString(),
      }))
  } catch (error) {
    console.error(`Error loading from ${source}:`, error)
    return []
  }
}

function prepareFeaturedNews() {
  featuredNewsArray = allNewsData.slice(0, 3)
  featuredNewsIndex = 0
}

function rotateFeaturedNews() {
  if (featuredNewsArray.length > 0) {
    featuredNewsIndex = (featuredNewsIndex + 1) % featuredNewsArray.length
    displayFeaturedNews()
  }
}

function displayNews(newsArray) {
  if (newsArray.length === 0) {
    newsContainer.innerHTML = '<div class="loading">Новости не найдены</div>'
    return
  }

  newsContainer.innerHTML = newsArray
    .map(
      (news) => `
      <article class="news-item">
        ${createNewsImage(news)}
        <div class="news-content">
          <a href="${news.link || news.url || "#"}" target="_blank" class="news-title">
            ${cleanText(news.title || "Без названия")}
          </a>
          <div class="news-date">
            ${formatDate(news.date || news.publishedAt)}
          </div>
          <div class="news-description">
            ${cleanText(news.description || news.content || "Описание недоступно")}
          </div>
        </div>
      </article>
    `,
    )
    .join("")
}

function createNewsImage(news) {
  const imageUrl = news.image_url || news.image || news.urlToImage
  if (imageUrl && imageUrl.trim() !== "") {
    return `<img src="${imageUrl}" alt="${cleanText(news.title || "Новость")}" class="news-image" 
             onerror="this.style.display='none'; this.parentElement.insertAdjacentHTML('afterbegin', '<div class=\\'image-placeholder\\'><i class=\\'fas fa-newspaper\\'></i></div>');"/>`
  }
  return '<div class="image-placeholder"><i class="fas fa-newspaper"></i></div>'
}

async function loadBestNews() {
  try {
    const response = await fetch(apiUrls.topNews)
    if (!response.ok) throw new Error("Failed to load top news")

    const data = await response.json()

    let topNewsArray = Object.values(data).slice(0, 5)

    topNewsArray = topNewsArray.map((item) => ({
      ...item,
      source: "gnews",
      title: item.title || item.headline || "Без названия",
      description: item.description || item.content || item.summary || "",
      image_url: item.image_url || item.image || item.urlToImage || "",
      link: item.link || item.url || "#",
      date: item.date || item.publishedAt || new Date().toISOString(),
    }))

    const mainNewsLinks = allNewsData.map((news) => news.link)
    topNewsArray = topNewsArray.filter((news) => !mainNewsLinks.includes(news.link))

    topNewsData = topNewsArray.slice(0, 5)

    displayBestNews(topNewsData)
  } catch (error) {
    console.error("Error loading best news:", error)
    topNewsData = allNewsData.slice(0, 5)
    displayBestNews(topNewsData)
  }
}

function displayBestNews(bestData = null) {
  const newsData = bestData || topNewsData

  bestNews.innerHTML = newsData
    .map(
      (news) => `
      <div class="best-item" onclick="window.open('${news.link || news.url || "#"}', '_blank')">
        ${createSidebarImage(news)}
        <div class="best-content">
          <div class="best-title">${cleanText(news.title || "Без названия")}</div>
          <div class="best-meta">${formatDate(news.date || news.publishedAt)}</div>
        </div>
      </div>
    `,
    )
    .join("")
}

function displayTrendingNews() {
  const startIndex = 20 + currentTrendingPage * trendingItemsPerPage
  const screenWidth = window.innerWidth
  let itemsToShow = trendingItemsPerPage

  if (screenWidth >= 1200) {
    itemsToShow = 8
  } else if (screenWidth >= 968) {
    itemsToShow = 8
  } else if (screenWidth >= 480) {
    itemsToShow = 6
  } else {
    itemsToShow = 4
  }

  const endIndex = startIndex + itemsToShow
  const trendingData = allNewsData.slice(startIndex, endIndex)

  if (trendingData.length === 0) {
    trendingContainer.innerHTML = '<div class="loading">Больше новостей нет</div>'
    updateTrendingNavigation()
    return
  }

  trendingContainer.innerHTML = trendingData
    .map(
      (news) => `
      <div class="trending-item" onclick="window.open('${news.link || news.url || "#"}', '_blank')">
        ${createTrendingImage(news)}
        <div class="trending-content">
          <div class="trending-title">${cleanText(news.title || "Без названия")}</div>
          <div class="trending-description" style="font-size: 0.75rem; color: var(--text-secondary); margin: 0.5rem 0; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
            ${cleanText(news.description || news.content || news.summary || "Описание недоступно")}
          </div>
          <div class="trending-meta">
            <span>${news.source || "Источник"}</span>
            <span>${formatDate(news.date || news.publishedAt)}</span>
          </div>
        </div>
      </div>
    `,
    )
    .join("")

  updateTrendingNavigation()
}

function createTrendingImage(news) {
  const imageUrl = news.image_url || news.image || news.urlToImage
  if (imageUrl && imageUrl.trim() !== "") {
    return `<img src="${imageUrl}" alt="${cleanText(news.title || "Новость")}" class="trending-image" 
             style="width: 100%; height: 160px; object-fit: cover; border-radius: 12px;"
             onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'image-placeholder\\' style=\\'height: 160px\\'><i class=\\'fas fa-newspaper\\'></i></div>';"/>`
  }
  return '<div class="image-placeholder" style="height: 160px;"><i class="fas fa-newspaper"></i></div>'
}

function displayFeaturedNews() {
  if (featuredNewsArray.length > 0) {
    const featured = featuredNewsArray[featuredNewsIndex]
    featuredTitle.textContent = cleanText(featured.title || "Загрузка главной новости...")
    featuredTitle.onclick = () => window.open(featured.link || featured.url || "#", "_blank")

    if (featuredSource) {
      featuredSource.textContent = featured.source || "NewsHub"
    }

    if (featuredTime) {
      featuredTime.textContent = formatDate(featured.date || featured.publishedAt)
    }

    if (featuredTags) {
      const tags = generateTags(featured)
      featuredTags.innerHTML = tags.map((tag) => `<span class="tag">#${tag}</span>`).join("")
    }

    const featuredSection = document.querySelector(".featured-section")
    const imageUrl = featured.image_url || featured.image || featured.urlToImage
    if (imageUrl && imageUrl.trim() !== "" && featuredSection) {
      featuredSection.style.backgroundImage = `linear-gradient(135deg, #8b5cf6 0%, #a855f7 50%, #c084fc 100%), url(${imageUrl})`
      featuredSection.style.backgroundBlendMode = "overlay"
    } else if (featuredSection) {
      featuredSection.style.backgroundImage = "var(--gradient-primary)"
      featuredSection.style.backgroundBlendMode = "normal"
    }

    if (featuredBtn) {
      featuredBtn.onclick = () => window.open(featured.link || featured.url || "#", "_blank")
    }
  }
}

function generateTags(news) {
  const title = (news.title || "").toLowerCase()
  const description = (news.description || news.content || "").toLowerCase()
  const content = title + " " + description

  const tagMap = {
    технолог: "Технологии",
    бизнес: "Бизнес",
    экономик: "Экономика",
    политик: "Политика",
    спорт: "Спорт",
    культур: "Культура",
    наук: "Наука",
    здоровь: "Здоровье",
    финанс: "Финансы",
    образован: "Образование",
  }

  const foundTags = []
  for (const [keyword, tag] of Object.entries(tagMap)) {
    if (content.includes(keyword) && foundTags.length < 3) {
      foundTags.push(tag)
    }
  }

  if (foundTags.length === 0) {
    foundTags.push("Новости", "Актуально")
  }

  return foundTags
}

function cleanText(text) {
  if (!text) return ""
  return text
    .replace(/['"`);}>]/g, "")
    .replace(/&quot;/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
}

function formatDate(dateString) {
  if (!dateString) return "Недавно"
  const date = new Date(dateString)
  const now = new Date()
  const diffHours = Math.floor((now - date) / (1000 * 60 * 60))

  if (diffHours < 1) return "Только что"
  if (diffHours < 24) return `${diffHours} ч. назад`
  if (diffHours < 48) return "Вчера"
  return date.toLocaleDateString("ru-RU")
}

function showLoading() {
  newsContainer.innerHTML = '<div class="loading">Загрузка новостей...</div>'
}

function showError() {
  newsContainer.innerHTML = '<div class="loading">Не удалось загрузить новости</div>'
}

function updateSectionTitle(section) {
  const titles = {
    all: "Все новости",
    newsdata: "NewsData",
    gnews: "GNews",
    newsapi: "NewsAPI",
    category: "Новости по категории",
    search: "Результаты поиска",
  }

  if (dynamicSectionTitle) {
    dynamicSectionTitle.textContent = titles[section] || "Все новости"
  }
}

function createSidebarImage(news) {
  const imageUrl = news.image_url || news.image || news.urlToImage
  if (imageUrl && imageUrl.trim() !== "") {
    return `<img src="${imageUrl}" alt="${cleanText(news.title || "Новость")}" class="sidebar-news-image" 
             onerror="this.style.display='none'; this.parentElement.insertAdjacentHTML('afterbegin', '<div class=\\'small-image-placeholder\\'><i class=\\'fas fa-newspaper\\'></i></div>');"/>`
  }
  return '<div class="small-image-placeholder"><i class="fas fa-newspaper"></i></div>'
}

function scrollToTrendingSection() {
  const trendingSection = document.querySelector(".trending-section")
  if (trendingSection) {
    const offsetTop = trendingSection.offsetTop - 70
    window.scrollTo({
      top: offsetTop,
      behavior: "smooth",
    })
  }
}

function updateTrendingNavigation() {
  const navPrev = document.querySelector(".nav-prev")
  const navNext = document.querySelector(".nav-next")
  const screenWidth = window.innerWidth
  let itemsPerPage = trendingItemsPerPage

  if (screenWidth >= 1200) {
    itemsPerPage = 8
  } else if (screenWidth >= 968) {
    itemsPerPage = 8
  } else if (screenWidth >= 480) {
    itemsPerPage = 6
  } else {
    itemsPerPage = 4
  }

  const startIndex = 20 + currentTrendingPage * itemsPerPage
  const nextStartIndex = 20 + (currentTrendingPage + 1) * itemsPerPage

  if (navPrev) {
    navPrev.disabled = currentTrendingPage === 0
    navPrev.style.opacity = currentTrendingPage === 0 ? "0.5" : "1"
  }

  if (navNext) {
    const hasMoreNews =
      nextStartIndex < allNewsData.length && allNewsData.slice(nextStartIndex, nextStartIndex + itemsPerPage).length > 0
    navNext.disabled = !hasMoreNews
    navNext.style.opacity = !hasMoreNews ? "0.5" : "1"
  }
}

function isWeatherWidgetOnPage() {
  const weatherWidget = document.querySelector(".weather-widget")
  return weatherWidget !== null
}

function isExchangeWidgetOnPage() {
  const exchangeWidget = document.querySelector(".exchange-widget")
  return exchangeWidget !== null
}

async function getUserCity() {
  try {
    const response = await fetch("https://ipapi.co/json/")
    if (response.ok) {
      const data = await response.json()
      return data.city || "Москва"
    }
  } catch (error) {
    console.error("Error getting user city:", error)
  }

  return "Москва"
}

async function loadNews() {
  try {
    const previousScrollPosition = newsContainer.scrollTop || 0
    const isInitialLoad = allNewsData.length === 0

    if (isInitialLoad) {
      showLoading()
    }

    console.log("[v0] Loading news with selectedSources:", selectedSources)

    const newNewsData = []

    if (selectedSources.includes("mixed")) {
      console.log("[v0] Loading from all sources (mixed mode)")

      const sourcesData = {
        newsdata: [],
        gnews: [],
        newsapi: [],
      }

      // Load news from all sources in parallel
      const loadPromises = ["newsdata", "gnews", "newsapi"].map(async (source) => {
        try {
          console.log(`[v0] Loading from ${source}...`)
          const newsFromSource = await loadFromSource(source, 250)
          console.log(`[v0] Loaded ${newsFromSource.length} news from ${source}`)
          sourcesData[source] = newsFromSource
        } catch (error) {
          console.error(`Error loading from ${source}:`, error)
          sourcesData[source] = []
        }
      })

      await Promise.all(loadPromises)

      // Interleave news from all sources
      const maxLength = Math.max(sourcesData.newsdata.length, sourcesData.gnews.length, sourcesData.newsapi.length)

      for (let i = 0; i < maxLength; i++) {
        if (sourcesData.newsdata[i]) newNewsData.push(sourcesData.newsdata[i])
        if (sourcesData.gnews[i]) newNewsData.push(sourcesData.gnews[i])
        if (sourcesData.newsapi[i]) newNewsData.push(sourcesData.newsapi[i])
      }

      console.log(`[v0] Interleaved ${newNewsData.length} news from all sources`)
    } else {
      console.log("[v0] Loading from selected sources:", selectedSources)
      for (const source of selectedSources) {
        try {
          console.log(`[v0] Loading from ${source}...`)
          const newsFromSource = await loadFromSource(source, 250)
          console.log(`[v0] Loaded ${newsFromSource.length} news from ${source}`)
          newNewsData.push(...newsFromSource)
        } catch (error) {
          console.error(`Error loading from ${source}:`, error)
        }
      }
    }

    console.log(`[v0] Total news loaded: ${newNewsData.length}`)

    if (!selectedSources.includes("mixed")) {
      newNewsData.sort((a, b) => new Date(b.date || b.publishedAt) - new Date(a.date || a.publishedAt))
    }

    if (newNewsData.length > 0) {
      allNewsData = newNewsData
      prepareFeaturedNews()
      displayNews(allNewsData)
      loadBestNews()
      displayTrendingNews()
      displayFeaturedNews()

      if (!isInitialLoad && newsContainer) {
        setTimeout(() => {
          newsContainer.scrollTop = previousScrollPosition
        }, 100)
      }
    }
  } catch (error) {
    console.error("Error loading news:", error)
    if (allNewsData.length === 0) {
      showError()
    }
  }
}

async function loadExchangeRates() {
  const exchangeRatesContainer = document.getElementById("exchange-rates")
  if (!exchangeRatesContainer) return

  try {
    const response = await fetch(apiUrls.exchangeRates)
    if (!response.ok) throw new Error("Failed to load exchange rates")

    const data = await response.json()

    const rates = data.exchangeRates || {}

    const currencyIcons = {
      EUR: "fa-euro-sign",
      USD: "fa-dollar-sign",
      UAH: "fa-hryvnia-sign",
    }

    exchangeRatesContainer.innerHTML = Object.entries(rates)
      .map(
        ([currency, rate]) => `
        <div class="exchange-item">
          <div class="exchange-currency">
            <i class="fas ${currencyIcons[currency] || "fa-coins"}"></i>
            ${currency}
          </div>
          <div class="exchange-rate">
            ${Number.parseFloat(rate).toFixed(2)} <span class="exchange-label">₽</span>
          </div>
        </div>
      `,
      )
      .join("")
  } catch (error) {
    console.error("Exchange rates error:", error)
    exchangeRatesContainer.innerHTML = `
      <div class="exchange-loading">Курсы недоступны</div>
    `
  }
}

updateSectionTitle("all")
loadNews()

if (isWeatherWidgetOnPage()) {
  loadWeather()
}

if (isExchangeWidgetOnPage()) {
  loadExchangeRates()
}

window.addEventListener("resize", () => {
  displayTrendingNews()
})
