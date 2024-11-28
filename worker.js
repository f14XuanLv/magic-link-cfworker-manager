export default {
    // 处理邮件事件
    async email(message, env, ctx) {
      try {
        console.log("Email worker triggered"); // 确认 Worker 被触发
  
        // 提取邮件的相关信息
        const subject = message.headers.get("subject") || "No Subject";
        const from = message.headers.get("from") || "Unknown Sender";
        const to = message.headers.get("to") || "Unknown Recipient"; // 获取收件人
  
        // 获取邮件正文
        let body = "";
        if (message.raw) {
          const rawEmail = await new Response(message.raw).text();
          body = rawEmail;
        }
  
        console.log("Subject:", subject);
        console.log("From:", from);
        console.log("To:", to);
        console.log("Body length:", body.length);
  
        // 解码 Quoted-Printable 编码的邮件内容
        const decodedBody = decodeQuotedPrintable(body);
  
        // 提取 magic-link
        const magicLink = extractMagicLink(decodedBody);
  
        if (magicLink) {
          console.log("Magic Link:", magicLink);
        } else {
          console.log("Magic Link not found.");
        }
  
        // 从收件人中提取纯邮件地址（去除姓名部分）
        const recipientEmail = extractEmailAddress(to);
        if (!recipientEmail) {
          console.log("Failed to extract recipient email address.");
          return;
        }
  
        console.log("Recipient Email:", recipientEmail);
  
        // 将 magicLink 存储到 KV 中，key 为 recipientEmail，value 为 magicLink
        if (magicLink) {
          await env.MAGIC_LINK.put(recipientEmail, magicLink);
          console.log(`Magic Link for ${recipientEmail} stored successfully.`);
        } else {
          console.log(`No Magic Link found for ${recipientEmail}.`);
        }
  
      } catch (err) {
        console.error("Error while processing the email:", err);
      }
    },
  
    // 处理 HTTP 请求
    async fetch(request, env, ctx) {
      const url = new URL(request.url);
      const path = url.pathname;
  
      // 从环境变量中获取访问密码后缀
      const get = `/${env.GET}`;
      const deleter = `/${env.DELETE}`;
  
      if (path.startsWith(`${get}/`)) {
        // 访问 /{get}/emailAddress 获取指定邮件地址的 magic link
        try {
          const emailAddress = decodeURIComponent(path.substring(get.length + 1));
          const magicLink = await env.MAGIC_LINK.get(emailAddress);
  
          if (magicLink) {
            return new Response(JSON.stringify({ email: emailAddress, magicLink }, null, 2), {
              headers: { "Content-Type": "application/json" },
            });
          } else {
            return new Response(JSON.stringify({ error: "Magic Link not found for the specified email address." }), {
              headers: { "Content-Type": "application/json" },
              status: 404,
            });
          }
        } catch (err) {
          console.error("Error while fetching magic link for specific email:", err);
          return new Response("Internal Server Error", { status: 500 });
        } 
      } 
      else if (path.startsWith(`${deleter}/`)) {
        // 访问 /{delete}/emailAddress 删除指定邮件地址的 magic link
        try {
          const emailAddress = decodeURIComponent(path.substring(deleter.length + 1));
          // 先查看是否存在该邮件地址的 magic link
          const magicLink = await env.MAGIC_LINK.get(emailAddress);
          if (!magicLink) {
            return new Response(JSON.stringify({ error: "Magic Link not found for the specified email address." }), {
              headers: { "Content-Type": "application/json" },
              status: 404,
            });
          }
          // 删除 magic link
          await env.MAGIC_LINK.delete(emailAddress);
          // 返回成功消息
          return new Response(JSON.stringify({ email: emailAddress, message: "Magic Link deleted successfully." }, null, 2), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          console.error("Error while deleting magic link for specific email:", err);
          return new Response("Internal Server Error", { status: 500 });
        }
      }
      else {
        // 处理未授权的访问或其他路径
        return new Response("Unauthorized", { status: 401 });
      } 
    },
};
  
  // 辅助函数：转义 HTML 以防止 XSS
function escapeHTML(str) {
    if (typeof str !== "string") {
        return "";
    }
    return str.replace(/[&<>"'`=\/]/g, function (s) {
      const entityMap = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
        "/": "&#x2F;",
        "`": "&#x60;",
        "=": "&#x3D;",
      };
      return entityMap[s];
    });
}
  
  // 辅助函数：解码 Quoted-Printable 编码
function decodeQuotedPrintable(input) {
    return input
      // 处理软换行（= 后跟换行符）
      .replace(/=\r?\n/g, '')
      // 处理编码字符，例如 =3D 转为 =
      .replace(/=([A-Fa-f0-9]{2})/g, (match, p1) => {
        return String.fromCharCode(parseInt(p1, 16));
      });
}
  
  // 辅助函数：提取 magic-link
function extractMagicLink(decodedData) {
    // 定义正则表达式匹配 magic-link
    const regex = /https:\/\/claude\.ai\/magic-link#\S+/g;
    const matches = decodedData.match(regex);
    return matches ? matches[0] : null;
  }
  
  // 辅助函数：从 "To" 或 "CC" 等字段提取纯邮件地址
  function extractEmailAddress(addressField) {
    // 使用正则表达式提取邮件地址
    const emailRegex = /<([^>]+)>/;
    const match = addressField.match(emailRegex);
    if (match) {
      return match[1].toLowerCase();
    } else {
      // 如果没有尖括号，尝试直接返回
      return addressField.trim().toLowerCase();
    }
}

