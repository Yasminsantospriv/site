window.SITE_CONFIG = {
  brand: {
    name: "Yasmin Santos",
    handle: "@yasminsantos",
    botHandle: "@yasminsantos_bot",
    eyebrow: "CONTEÚDO • 18+",
    headline: "Seu acesso exclusivo começa aqui",
    description: "Conheça meu canal VIP, conteúdos e prévias em um só lugar."
  },

  links: {
    instagramReal: "https://instagram.com/SEU_USUARIO",
    telegramReal: "https://t.me/SEU_USUARIO",
    telegramBot: "https://paylume.fans/l/yasmimsantoss",
    support: "https://wa.me/55SEUNUMERO",
    rouletteExternal: "https://sharkbot.com.br/r/yasminsantos"
  },

  payment: {
    createEndpoint: "https://yasmin-backend.novinhadize9.workers.dev/api/criar-pagamento?v=13.6.4",
    workerStatusEndpoint: "https://yasmin-backend.novinhadize9.workers.dev/api/status?v=13.6.4",
    contractVersion: "13.6.4",
    statusEndpoint: "https://yasmin-backend.novinhadize9.workers.dev/api/status-pagamento",
    verifyEndpoint: "https://yasmin-backend.novinhadize9.workers.dev/api/verificar-acesso",
    activationUrl: "https://yasminsantospriv.github.io/site/ativar/",
    pollIntervalMs: 10000,
    maxPollAttempts: 60
  },

  /*
    Planos vendidos diretamente pelo site.
    A entrega é uma página de conteúdo liberada após a confirmação do Pix.
  */
  siteAccess: {
    plans: {
      daily: {
        code: "diario",
        name: "Acesso diário",
        period: "24 horas",
        price: "R$ 9,90"
      },
      monthly: {
        code: "mensal",
        name: "Acesso mensal",
        period: "30 dias",
        price: "R$ 34,90"
      },
      lifetime: {
        code: "vitalicio",
        name: "Acesso vitalício",
        period: "Sem expiração",
        price: "R$ 199,00"
      }
    }
  },

  /*
    Planos da página Privacy.
    A entrega é o botão “Acesse aqui”, liberado somente após a confirmação.
    O endereço real do grupo VIP fica no Secret PRIVACY_TELEGRAM_URL do Worker,
    portanto não aparece neste arquivo público.
  */
  privacyAccess: {
    mainOffer: {
      code: "mensal",
      name: "Plano mensal",
      period: "30 dias",
      originalPrice: "R$ 25,00",
      price: "R$ 20,00",
      discount: "20% OFF"
    },
    plans: {
      quarterly: {
        code: "trimestral",
        name: "Plano trimestral",
        period: "90 dias",
        price: "R$ 49,90"
      },
      semester: {
        code: "semestral",
        name: "Plano de 6 meses",
        period: "180 dias",
        price: "R$ 99,90"
      }
    }
  },

  instagram: {
    posts: "12",
    followers: "12,8 mil",
    following: "184"
  },

  privacy: {
    photos: "50",
    videos: "89",
    likes: "15,2 mil"
  },

  aiChat: {
    enabled: false,
    endpoint: "",
    welcomeMessage: "Oi, vi que você chegou por aqui 😊 Quer conhecer meu conteúdo exclusivo?",
    fallbackReply: "Adorei sua mensagem. Meu atendimento inteligente ainda está sendo configurado, mas você já pode conhecer as opções exclusivas no perfil."
  },

  instagramSuggestions: [
    {name:"Luna Martins",handle:"@lunamartins",image:"",url:"https://SEU-SITE-LUNA.com"},
    {name:"Maya Costa",handle:"@mayacosta",image:"",url:"https://SEU-SITE-MAYA.com"},
    {name:"Clara Alves",handle:"@claraalves",image:"",url:"https://SEU-SITE-CLARA.com"}
  ],

  instagramReels: [
    {title:"Reel 1",thumbnail:"",videoUrl:""},
    {title:"Reel 2",thumbnail:"",videoUrl:""},
    {title:"Reel 3",thumbnail:"",videoUrl:""}
  ]
};
