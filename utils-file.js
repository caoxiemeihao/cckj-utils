import uuidv4 from 'uuid/v4'

function Ajax({ url, success, data, failed, type = 'POST' }) {
  var xhr = new XMLHttpRequest()

  xhr.onload = () => {
    if (xhr.status === 200 || xhr.status === 304) {
      let res = {}

      try {
        res = JSON.parse(xhr.responseText)
      } catch (err) { console.warn(err) }
      success(res)
    } else {
      failed && failed(xhr)
    }
  }
  xhr.open(type, url)
  xhr.setRequestHeader("Content-type", "application/json")
  xhr.send(JSON.stringify(Object.assign({}, data)))
}

/**
 * 图片读取，转换base64
 * 返回 Promise，支持回调
 * @return {
 *   FileList: Files -> input 原生读取的 FileList，原样返回
 *   FileArr: []     -> 读取结果
 * }
 */
export function readIMG2base64(imgFiles) {
  console.log('files ->', imgFiles)
  return new Promise((resolve, reject) => {
    let idx = 0
      , res = {
        FileList: imgFiles, // input 原生读取的 FileList
        FileArr: []         // 读取结果
      }
      , reader = new FileReader()
      , readFile = file => {
        reader.onerror = err => console.warn(`--------文件读取出错\n`, err, `\n--------`)
        reader.onprogress = ev => console.log(`${~~(ev.loaded / ev.total * 100)} % `)
        reader.onload = ev => {
          res.FileArr.push({
            base64: ev.target.result,          // 图片base64编码
            file,                              // 图片本身
            index: idx,
            lastModified: file.lastModified,
            name: file.name,
            size: file.size,
            type: file.type
          })
          idx++
          if (imgFiles[idx]) {
            readFile(imgFiles[idx])
          } else {
            resolve(res)
          }
        }
        reader.readAsDataURL(file)
      }

    imgFiles.length
      ? readFile(imgFiles[idx]) // 单个
      : readFile(imgFiles)      // 多图
  })
}

/** upload image to 阿里云 OSS server */
export function uploadFileToOSS({ file, signatureURL, success, failed }) {
  return new Promise(async (resolve, reject) => {
    if (!(file instanceof File)) {
      console.error('非文件')
      reject(`Not a valid file.`)
      failed && failed(`Not a valid file.`)
      return
    }

    let authorizedSignature
      , expired = 30 * 1000  // AliOSS 过期时间，实测 30秒 [原计划计划10分钟]
      , sessionField = 'oss-authorized-signature'
      , startUpload = ({ accessid, host, policy, signature, code }) => {
        if (code !== '200') {
          console.warn(`OSS Token 请求失败`)
          reject(`OSS Token 请求失败`)
          failed && failed(`OSS Token 请求失败`)
          return
        }

        let formData = new FormData()
          , fileName = `${uuidv4() + file.name.substr(file.name.lastIndexOf('.'))}`

        formData.append('key', fileName)                 // 唯一文件名
        formData.append('policy', policy)                // policy
        formData.append('OSSAccessKeyId', accessid)      // accessKeyId
        formData.append('success_action_status', '200')  // 成功后返回的操作码
        formData.append('Signature', signature)          // 鉴权签名
        formData.append('file', file)

        /**
         * 图片上传至阿里云 OSS
         * fetch 参考链接 [https://developer.mozilla.org/zh-CN/docs/Web/API/Fetch_API/Using_Fetch]
         * @return [注意，没有返回值，code==200就是成功]
         */
        window.fetch(host, { method: 'POST', body: formData })
          .then(_ => {
            resolve(`${host}/${fileName}`)
            success && success(`${host}/${fileName}`)
          })
      }

    try {
      authorizedSignature = JSON.parse(window.sessionStorage.getItem(sessionField)) || {}
    } catch (e) {
      authorizedSignature = {}
    }

    if (
      (!authorizedSignature.signature)                        // 没有签名
      ||
      (Date.now() - authorizedSignature.timestamp > expired)  // 签名过期
    ) {
      Ajax({
        url: signatureURL,
        success(authorizedSignature) {
          authorizedSignature.timestamp = Date.now()
          window.sessionStorage.setItem(sessionField, JSON.stringify(authorizedSignature))
          startUpload(authorizedSignature)
        }
      })
    } else {
      startUpload(authorizedSignature)
    }
  })
}
