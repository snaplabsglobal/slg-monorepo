import type { Copy } from "./copy.types";

/**
 * Official Marketing Copy (Chinese)
 *
 * Source: 260207_JSS销售话术与营销完整方案_CompanyCam差异化定位.md
 *
 * Core positioning:
 * "CompanyCam tries to be helpful by being automatic.
 *  JSS tries to be trustworthy by being explicit."
 */
export const copyZh: Copy = {
  hero: {
    h1: "工地照片你信得过——哪怕一切都出了问题。",
    h2: "离线优先的工地记录系统。只给建议，不替你动手。",
    value: "离线优先 · 只给建议\n你不点头，什么都不会改",
    stance: "大多数工地拍照App追求便捷，JSS追求掌控。",
    bullets: [
      {
        title: "离线优先设计",
        desc: "照片先写本地，上传在后台跑，拍照永远不卡。"
      },
      {
        title: "只给建议",
        desc: "没有确认就不执行，每一步都可审查、可撤销。"
      },
      {
        title: "照片归公司",
        desc: "员工拍照，老板掌控。人走账号停，资料带不走。"
      }
    ],
    cta: "试试 Self-Rescue"
  },

  basement: {
    h2: "工地没有完美信号，你的相机不该依赖它。",
    body: [
      "地下室没信号，水泥墙杀死信号，验收不等人。",
      "JSS 先把每张照片写进本地，上传在后台跑，拍照永远不卡。"
    ],
    compare: {
      other: "别的App：照片在队列里排队上传，同步断了你都不知道存没存。",
      jss: "JSS：按下快门就算数，上传失败只是状态——不是丢失。"
    },
    anchor: "信号断了，证据不会断。"
  },

  failures: {
    title: "工地照片工具通常在哪里失败",
    cases: [
      {
        title: "上传卡死",
        subtitle: "你拍了，你以为同步了，其实没有。",
        reason: [
          "照片绑死在上传队列里",
          "重试失败悄无声息",
          "没有明确的失败提示"
        ],
        jss: "JSS 先写本地，上传永远不卡拍照。"
      },
      {
        title: "历史被偷偷改了",
        subtitle: "照片自动移动，几个月后你才发现，什么都对不上了。",
        reason: [
          "后台自动整理",
          "改动一直在发生",
          "修错只能手动清理"
        ],
        jss: "JSS：只给建议，不经确认不执行。"
      },
      {
        title: "证据变成噪音",
        subtitle: "几百张照片，没有顺序，验收时说不清楚。",
        reason: [
          "很适合发进度",
          "不是为正式证据设计的",
          "没有结构化交付"
        ],
        jss: "JSS：照片整理成证据集，时间线清晰，只读交付。"
      }
    ],
    summary: "这些不是边缘情况，这就是承包商浪费时间——输掉争议的原因。"
  },

  smartTrace: {
    h2: "Smart Trace 记得清楚，决定权在你。",
    body: [
      "你离线拍照，JSS 记住了位置和时间。",
      "之后，它把点连起来——小心翼翼地。",
      "不是靠猜，不是背着你改，",
      "只是一个清楚的建议，等你点头。"
    ],
    uiExample: "发现照片拍摄位置接近：West 41st Ave 项目（42米）",
    note: "你不点，什么都不会发生。",
    anchor: "在 JSS 里，系统可以建议，只有你能决定。"
  },

  selfRescue: {
    h2: "安全地修复过去",
    subhead: "在让你信任新照片之前，JSS 先帮你整理旧的。",
    body: [
      "大多数承包商已经有多年的工地照片——散落在手机、App、文件夹里。",
      "Self-Rescue 模式帮你按位置和时间整理它们。",
      "如果 JSS 连你的旧照片都不敢乱动，它也不配接管你的新照片。"
    ],
    steps: [
      {
        title: "过滤私人和旅行照片",
        desc: "我们自动排除明显不是工地的内容。"
      },
      {
        title: "保守地分组可能的工地",
        desc: "根据位置建议分组，一切由你审核。"
      },
      {
        title: "不经审核绝不执行",
        desc: "你掌控全局。应用一次，随时可撤。"
      }
    ],
    trustAnchor: "只给建议，你掌控全局。",
    cta: "试试 Self-Rescue"
  },

  whySwitch: {
    quotes: [
      "它不会过后给我惊吓。",
      "验收官不再追问了。",
      "我终于信得过我的照片记录。"
    ],
    summary: "CompanyCam 靠自动化来帮忙，JSS 靠明确来赢得信任。承包商换工具，不是为了更多功能，而是为了更少意外。",
    cta: "试试 Self-Rescue"
  }
};
