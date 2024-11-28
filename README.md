# magic-link-cfworker-manager

用cf的电子邮件worker来处理claude的magic-link，并存储到kv中

## 首先在cf上创建一个电子邮件worker

**将worker代码部署到对应的worker上**

![alt text](image.png)

## 然后创建一个KV空间（用于存储magic-link）

![alt text](image-2.png)

## 再设置worker的环境变量

![alt text](image-3.png)

## 最后设置worker的路由
进去编辑以后选中对应的worker
![alt text](image-5.png)

# 测试

## 存储

往fuclaude输入你的域名邮箱，然后点击continue
然后去kv里面查看是否有对应的magic-link

![alt text](image-6.png)

## 删除（x是环境变量DELETE的值）

向 https://xxxxx.workers.dev/{x}/{emailAddress} 发送请求

![alt text](image-7.png)

## 读取（y是环境变量GET的值）

向 https://xxxxx.workers.dev/{y}/{emailAddress} 发送请求

![alt text](image-8.png)
