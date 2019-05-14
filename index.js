export import { readIMG2base64, uploadFileToOSS } from './utils-file'

/**
 * 安全的 JSON.parse 😀 [解析失败返回null]
 * @param jsonStr JSON字符串
 */
export function JSONparse(jsonStr) {
  let ret = null
  try {
    ret = JSON.parse(jsonStr)
  } catch (e) {
    console.warn('JSON.parse() error\n------------------\n', jsonStr + '\n------------------\n', e)
  } finally {
    return ret
  }
}

/** URLserialize */
export function URLserialize(json = {}) {
  let arr = []

  for (let key in json) arr.push(`${key}=${json[key]}`)

  return arr.join('&')
}

/** https前缀 */
export function httpsPrefix(url) {
  let _url = url

  try {
    _url = (url.startsWith('http') ? url : 'https://' + url).replace(/$http(s?)/, 'https');
  } catch (e) { console.warn(e) }

  return _url
}

/**
 * 阿里云图片大小处理[oss服务器自带]
 * @param {String} url 图片链接
 * @param {JSON} options 处理参数 [w]、[h]
 * 文档链接 [https://help.aliyun.com/document_detail/44688.html]
 * 示例结果 https://cc-west-usa.oss-us-west-1.aliyuncs.com/15330528/2076770670210.jpg?x-oss-process=image/resize,m_fill,w_200,h_200
 * @return [柯里化(urry)]
 */
export function imageSizeProcess(options = {}) {
  let param = `?x-oss-process=image/resize`
    , paramLen = 0

  for (let k in options) {
    param += `,${k}_${options[k]}`
    paramLen++
  }

  return url => this.httpsPrefix(url) +
    (
      paramLen > 1
        ? param + ',m_fill' // 固定宽高，将延伸出指定w与h的矩形框外的最小图片进行居中裁剪
        : param + ',m_lfit' // 等比缩放，限制在指定w与h的矩形内的最大图片
    )
}

/**
 * 读取本地图片，文件
 * [默认读取图片]
 * 返回 Promise，支持回调
 */
export function readLocalFile({ accept = 'image/*', success, failed }) {
  return new Promise((resolve, rejcet) => {
    let oInput = document.createElement('input')

    oInput.type = 'file'
    oInput.accept = accept
    oInput.multiple = 'multiple'
    oInput.onchange = ev => {
      if (accept.includes('image')) {
        readIMG2base64({ imgFiles: ev.target.files }).then(res => {
          resolve(res)
          success && success(res)
        })
      } else {
        resolve(ev.target.files)
        success && success(ev.target.files)
      }
    }
    oInput.click()
  })
}
