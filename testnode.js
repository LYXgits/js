// 假设 flowUtils 是你在其他地方定义好的工具集，包含了流量头解析、流量转换等函数
const flowUtils = {
    parseFlowHeaders: (subInfo) => {
      // 解析流量头信息的逻辑
      return {
        expires: subInfo.expires,
        total: subInfo.total,
        usage: {
          upload: subInfo.upload,
          download: subInfo.download,
        }
      };
    },
    getFlowHeaders: async (url) => {
      // 获取流量头信息的逻辑，这里只返回一个示例对象
      return {
        expires: 1678534920,  // 过期时间（Unix 时间戳）
        total: 1000000000,    // 总流量
        upload: 500000000,    // 已上传流量
        download: 400000000,  // 已下载流量
      };
    },
    flowTransfer: (bytes) => {
      // 转换流量单位的逻辑，简单的转换为 MB/GB 等
      let value = bytes / 1024 / 1024;  // 将字节转换为 MB
      return {
        value: value.toFixed(2),  // 保留两位小数
        unit: 'MB',
      };
    },
    getRmainingDays: (args) => {
      // 计算剩余天数的逻辑
      const currentDate = new Date();
      return 10;  // 假设剩余10天
    }
  };
  
  // 定义 operator 函数
  async function operator(proxies = [], targetPlatform, env, defaultProxy) {
    let args = $arguments || {};
    const { parseFlowHeaders, getFlowHeaders, flowTransfer, getRmainingDays } = flowUtils;
    const sub = env.source[proxies?.[0]?._subName || proxies?.[0]?.subName];
    let subInfo;
  
    if (sub.source === 'local' && !['localFirst', 'remoteFirst'].includes(sub.mergeSources)) {
      if (sub.subUserinfo) {
        if (/^https?:\/\//.test(sub.subUserinfo)) {
          subInfo = await getFlowHeaders(undefined, undefined, undefined, sub.proxy, sub.subUserinfo);
        } else {
          subInfo = sub.subUserinfo;
        }
      }
    } else {
      let url = `${sub.url}`.split(/[\r\n]+/).map(i => i.trim()).filter(i => i.length)?.[0];
    
      let urlArgs = {};
      const rawArgs = url.split('#');
      url = url.split('#')[0];
      if (rawArgs.length > 1) {
        try {
          // 支持 `#${encodeURIComponent(JSON.stringify({arg1: "1"}))}`
          urlArgs = JSON.parse(decodeURIComponent(rawArgs[1]));
        } catch (e) {
          for (const pair of rawArgs[1].split('&')) {
            const key = pair.split('=')[0];
            const value = pair.split('=')[1];
            // 部分兼容之前的逻辑 const value = pair.split('=')[1] || true;
            urlArgs[key] = value == null || value === '' ? true : decodeURIComponent(value);
          }
        }
      }
      args = { ...urlArgs, ...args };
      if (!args.noFlow) {
        if (sub.subUserinfo) {
          if (/^https?:\/\//.test(sub.subUserinfo)) {
            subInfo = await getFlowHeaders(undefined, undefined, undefined, sub.proxy, sub.subUserinfo);
          } else {
            subInfo = sub.subUserinfo;
          }
        } else {
          subInfo = await getFlowHeaders(url);
        }
      }
    }
  
    if (subInfo) {
      let {
        expires,
        total,
        usage: { upload, download },
      } = parseFlowHeaders(subInfo);
      if (args.hideExpire) {
        expires = undefined;
      }
      const date = expires ? new Date(expires * 1000).toLocaleDateString() : '';
      let remainingDays;
      try {
        remainingDays = getRmainingDays({
          resetDay: args.resetDay,
          startDate: args.startDate,
          cycleDays: args.cycleDays,
        });
      } catch (e) {}
      let show = upload + download;
      if (args.showRemaining) {
        show = total - show;
      }
      const showT = flowTransfer(Math.abs(show));
      showT.value = show < 0 ? '-' + showT.value : showT.value;
      const totalT = flowTransfer(total);
      let name = `流量 ${showT.value} ${showT.unit} / ${totalT.value} ${totalT.unit}`;
      if (remainingDays) {
        name = `${name} | ${remainingDays} 天`;
      }
      if (date) {
        name = `${name} | ${date}`;
      }
  
      // 使用传入的默认代理节点信息
      const node = { ...defaultProxy, name };
  
      proxies.unshift(node);  // 将默认代理节点插入到代理列表的最前面
    }
  
    return proxies;
  }
  
  // 示例：调用 operator 函数并提供默认代理节点信息
  const defaultProxy = {
    type: 'ss',
    server: '1.0.0.1',
    port: 80,
    cipher: 'aes-128-gcm',
    password: 'password',
  };
  
  // 示例环境数据（`env` 和 `proxies` 是根据实际情况提供的）
  const env = {
    source: {
      myProxy: {
        url: 'http://example.com/flow',
        source: 'remote',
        mergeSources: 'remoteFirst',
        subUserinfo: 'http://example.com/flow/info',  // 或者直接是流量信息
      }
    }
  };
  
  const proxies = [];  // 可以传入已有的代理节点数组，或是空数组
  const targetPlatform = 'platformExample';
  
  // 调用 operator 函数
  operator(proxies, targetPlatform, env, defaultProxy)
    .then(result => {
      console.log(result);
    })
    .catch(error => {
      console.error('Error:', error);
    });
  