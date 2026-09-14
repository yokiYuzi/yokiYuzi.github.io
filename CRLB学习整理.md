# Cramér–Rao 下界（CRLB）学习整理

> 教材：Steven M. Kay, *Fundamentals of Statistical Signal Processing, Vol. I: Estimation Theory*
> 覆盖范围：第 2 章（MVU 估计）～ 3.6 节（参数变换）
> 整理日期：2026-09-14

---

## 0. 全景地图：这几节在讲一条什么样的逻辑链

先把主线拎出来，后面所有细节都挂在这条链上：

```
怎么衡量一个估计量的好坏？            →  mse = var + bias²        (2.6)
    ↓ 直接最小化 mse 做不到（最优解依赖未知的 θ）
先强制无偏，再最小化方差              →  MVU 估计量
    ↓ MVU 存在吗？找得到吗？
先问：无偏估计量最好能做到多好？       →  CRLB  var(θ̂) ≥ 1/I(θ)   (3.6)
    ↓ I(θ) 怎么算？
Fisher 信息 = 对数似然的平均曲率       →  I(θ) = −E[∂²ln p/∂θ²]
    ↓ 界什么时候够得着？够得着时估计量是谁？
可达条件（分解 score）                →  ∂ln p/∂θ = I(θ)(g(x)−θ)  (3.7)
    ↓ 具体到"WGN 中的信号"这一大类模型
通用公式                              →  var(θ̂) ≥ σ²/Σ(∂s/∂θ)²   (3.14)
    ↓ 我关心的不是 θ 而是 g(θ) 怎么办？
参数变换                              →  var(α̂) ≥ (∂g/∂θ)²/I(θ)  (3.16)
```

一句话总结这几节：**在动手设计算法之前，先在纸上算出"理论上最好能多准"，并且顺便看看那个最优估计量会不会自己掉出来。**

---

## 1. 前置知识：从 MSE 到 MVU（第 2 章）

### 1.1 无偏 ≠ 好

无偏只保证"平均而言能命中真值"，不保证单次估计准。但无偏性在**合并多个估计**时至关重要。

### 1.2 平均 n 个估计量：方差为什么是 var(θ̂₁)/n

设 $\hat\theta=\frac{1}{n}\sum_{i=1}^{n}\hat\theta_i$，**两个假设各用在一步**：

**第一步（用"互不相关"）**

方差的两条基本性质：

- 常数提出要平方：$\mathrm{var}(aX)=a^2\mathrm{var}(X)$，这里 $a=1/n$，提出来是 $1/n^2$ 而非 $1/n$
- 和的方差：$\mathrm{var}\big(\sum_i\hat\theta_i\big)=\sum_i\mathrm{var}(\hat\theta_i)+2\sum_{i<j}\mathrm{cov}(\hat\theta_i,\hat\theta_j)$

**uncorrelated** 让所有协方差为零，交叉项整块消失：

$$\mathrm{var}(\hat\theta)=\frac{1}{n^2}\sum_{i=1}^{n}\mathrm{var}(\hat\theta_i)$$

> ⚠️ 若各估计相关（例如来自同一批数据、共用同一噪声源），交叉项不为零，结论失效。极端情况：所有 $\hat\theta_i$ 完全相同时，平均后方差一点也没降。

**第二步（用"同方差"）**

$\mathrm{var}(\hat\theta_i)\equiv\sigma^2$ 对所有 $i$ 成立，于是求和是 $n$ 个相同的数相加：

$$\mathrm{var}(\hat\theta)=\frac{1}{n^2}\cdot n\sigma^2=\frac{\sigma^2}{n}=\frac{\mathrm{var}(\hat\theta_1)}{n}$$

> 📌 这里的 $\hat\theta_1$ **没有任何特殊性**，只是"随便拿一个当代表"来指代那个公共的 $\sigma^2$。写成 $\mathrm{var}(\hat\theta_7)/n$ 完全等价。

**直觉**：$1/n^2$ 与 $n$ 项相加，一个平方、一个线性，净剩 $1/n$；标准差按 $1/\sqrt n$ 下降。随机误差每次方向不同，相加时互相抵消（**非相干叠加**）。

**而偏差不会被抵消**：若 $E(\hat\theta_i)=\theta+b$，则 $E(\hat\theta)=\theta+b$。偏差每次朝同一方向偏，是**相干叠加**：$n$ 个 $b$ 加起来是 $nb$，除以 $n$ 又变回 $b$。

> **核心结论：平均（或增加数据）能压方差，压不掉偏差。**

### 1.3 图 2.2 怎么读

| 视觉现象 | 含义 | (a) 无偏 | (b) 有偏 |
|---|---|---|---|
| **峰变高变窄**（纵向） | 方差 $\sigma^2/n$ 减小；密度积分恒为 1，变窄必然变高 | ✅ 有 | ✅ 有 |
| **峰偏离 θ**（横向） | 偏差 $b$ | ❌ 无 | ✅ 有，且**不随 n 缩小** |

- (a)：越来越准地锁定真值
- (b)：越来越**自信地锁定一个错值**——n 增大反而使你对偏离真值的结果更加确信，情况更糟

### 1.4 MSE 分解：mse = var + bias²（式 2.6）

**配凑技巧**：在括号里同时加减 $E(\hat\theta)$：

$$\hat\theta-\theta=\underbrace{\big(\hat\theta-E(\hat\theta)\big)}_{A}+\underbrace{\big(E(\hat\theta)-\theta\big)}_{B}$$

两部分性质完全不同：

- $A$ 是**随机量**（围绕自身均值的抖动），$E[A]=0$
- $B$ 是**确定常数**（$E(\hat\theta)$ 和 $\theta$ 都是固定数值），即偏差 $b(\theta)$

展开：

$$E[(A+B)^2]=\underbrace{E[A^2]}_{=\,\mathrm{var}(\hat\theta)}+\underbrace{2E[AB]}_{=\,2B\cdot E[A]=0}+\underbrace{E[B^2]}_{=\,b^2(\theta)}$$

**交叉项为零的关键**：$B$ 是常数可提到期望外，而 $E[A]=0$。

$$\boxed{\mathrm{mse}(\hat\theta)=\mathrm{var}(\hat\theta)+b^2(\theta)}$$

几何上等价于**勾股定理**：零均值随机分量 $A$ 与常数分量 $B$ 在 $L^2$ 空间中正交，所以是平方相加、无交叉项。

### 1.5 为什么转向 MVU

$b(\theta)$ 依赖**未知的** $\theta$，所以直接最小化 mse 通常做不到（最优估计量会依赖你正在找的那个量）。因此教材转而：**先强制 $b=0$（限定无偏），再最小化方差** → MVU 估计量。

### 1.6 图 2.5 怎么读

- 虚线是 CRLB，是 **θ 的函数**（不同真值处难度不同），所有实线（各无偏估计量的方差）都在其上方
- $\hat\theta_2$ 与 $\hat\theta_3$ **相交** ⟹ 各有擅长区间，谁也不是一致最优。这是为什么 MVU 要求在**每一个** θ 上都最小（"for each value of θ"）
- $\hat\theta_1$ 处处最低但**没贴到虚线**：**下界达不到 ≠ MVU 不存在**。此时 CRLB 这条路走不通，需改用 RBLS 定理（第 5 章）

---

## 2. 似然函数：定义与计算

### 2.1 一个函数，两种读法

**似然函数和 PDF 是同一个函数 $p(\mathbf{x};\theta)$，只是"把谁当变量"反过来了。**

| | 固定什么 | 变量 | 问的问题 |
|---|---|---|---|
| **PDF** | 参数 $\theta$ | 数据 $\mathbf{x}$ | 参数是 θ 时，各种数据出现的可能性分布？ |
| **似然函数** | 数据 $\mathbf{x}$（已观测到） | 参数 $\theta$ | 我手上这组数据，在各候选 θ 下有多"像话"？ |

估计问题里数据已知、θ 未知，所以要反过来看。**似然函数本质上是给每个候选 θ 打分。**

### 2.2 计算三步

1. 写出数据的 PDF（由信号+噪声模型决定）
2. **把实际观测到的数字代进去**
3. 剩下的、只含 θ 的表达式就是 $L(\theta)$

### 2.3 例子

**离散（最直观）**：抛 10 次得 7 正，$L(p)=\binom{10}{7}p^7(1-p)^3$。
$L(0.5)=0.117$，$L(0.7)=0.267$，$L(0.2)=0.0008$ ⟹ $p=0.7$ 最能解释数据，即 MLE。

**连续（Example 3.1）**：$x[0]=A+w[0]$，$w[0]\sim\mathcal N(0,\sigma^2)$，代入观测值 $x[0]=3$：

$$L(A)=\frac{1}{\sqrt{2\pi\sigma^2}}\exp\left[-\frac{1}{2\sigma^2}(3-A)^2\right]$$

这就是图 3.1 画的曲线——**横轴是 $A$，不是 $x$**。

### 2.4 多样本与对数似然

独立时联合 PDF 连乘，取对数变连加：

$$\ln p(\mathbf{x};A)=-\frac{N}{2}\ln(2\pi\sigma^2)-\frac{1}{2\sigma^2}\sum_{n=0}^{N-1}(x[n]-A)^2$$

高斯情形下这是 $A$ 的**二次函数**（开口向下的抛物线），求导一次即可解出峰值。

### 2.5 三个常见误区

| ❌ 错误理解 | ✅ 正确理解 |
|---|---|
| 似然是 θ 的概率 | $\int L(\theta)d\theta\ne1$，连续情形是密度值可 >1。**只有相对大小有意义**，常数因子可随便扔 |
| $p(\mathbf{x};\theta)$ 与 $p(\mathbf{x}\|\theta)$ 一样 | **分号**表示 θ 是确定但未知的常数（经典/频率派）；**竖线**是贝叶斯的条件概率，θ 也是随机变量并配先验（第 10 章起） |
| 图 3.1 横轴是 $x$ | 横轴是候选参数值 $A$ |

---

## 3. 估计精度从哪里来（3.3 节）

Kay 用同一个例子给了**三个层次**的解释。

### 3.1 第一层：误差就是噪声本身

单样本 $x[0]=A+w[0]$，取 $\hat A=x[0]$：

$$E[\hat A]=A\ \text{（无偏）},\qquad \mathrm{var}(\hat A)=\sigma^2,\qquad \hat A-A=w[0]$$

只有一个样本，没有"平均掉噪声"的余地，**这次测量偏多少，估计就偏多少**。所以"精度"和"噪声强度"在这里是同一个数。

### 3.2 第二层：似然函数的"尖锐度"（图 3.1）

固定 $x[0]=3$，把 $p(x[0];A)$ 画成 $A$ 的函数：

| $\sigma$ | 曲线形状 | 关键数值 | 可信区间 $3\pm3\sigma$ |
|---|---|---|---|
| $\sigma_1=1/3$ | 又高又尖 | $p_1(3;A{=}4)\delta=0.01\delta$ vs $p_1(3;A{=}3)\delta=1.20\delta$，**相差约 120 倍** | $[2,4]$ |
| $\sigma_2=1$ | 又矮又胖 | $A=2,3,4,5$ 的似然差不多，无法分辨 | $[0,6]$ |

**机制**：$\sigma^2$ 小 ⟹ PDF 对 $A$ 依赖强 ⟹ 一次观测能排除更多候选值 ⟹ 信息量大。

> 这正是 3.3 节开头的纲领："the more the PDF is influenced by the unknown parameter, the better we should be able to estimate it."

> 💡 细节：高斯 PDF 只通过差值 $(x[0]-A)$ 依赖两者，所以**同一个 $\sigma$ 同时扮演两个角色**——既是 $x$ 围绕 $A$ 的散布，也是似然沿 $A$ 轴的宽度。这解释了为什么第一层和第二层是同一个数。

### 3.3 第三层：曲率 = Fisher 信息（式 3.3）

$$-\frac{\partial^2\ln p(x[0];A)}{\partial A^2}=\frac{1}{\sigma^2}=I(A)\quad\Longrightarrow\quad \mathrm{var}(\hat A)=\sigma^2=\frac{1}{I(A)}$$

模糊的"accuracy improves"被精确化成 **CRLB $=\sigma^2$**，且 $\hat A=x[0]$ 正好达到它。

### 3.4 极限检验

| 极限 | 似然函数形态 | 曲率 | CRLB |
|---|---|---|---|
| $\sigma^2\to0$ | 退化成 $A=x[0]$ 处的冲激 | $\to\infty$ | $\to0$，完美估计 |
| $\sigma^2\to\infty$ | 沿 $A$ 方向**趋于平坦**（PDF 不依赖参数） | $\to0$ | $\to\infty$，无信息可提取 |

---

## 4. CRLB 定理（3.4 节，Theorem 3.1）

### 4.1 定理陈述

**正则条件**：$E\left[\dfrac{\partial\ln p(\mathbf{x};\theta)}{\partial\theta}\right]=0\quad$ for all $\theta$

**下界**：

$$\mathrm{var}(\hat\theta)\ \ge\ \frac{1}{-E\left[\dfrac{\partial^2\ln p(\mathbf{x};\theta)}{\partial\theta^2}\right]}=\frac{1}{I(\theta)}\tag{3.6}$$

**可达条件（当且仅当）**：

$$\frac{\partial\ln p(\mathbf{x};\theta)}{\partial\theta}=I(\theta)\big(g(\mathbf{x})-\theta\big)\tag{3.7}$$

此时 $\hat\theta=g(\mathbf{x})$ 即 MVU 估计量，最小方差为 $1/I(\theta)$。

### 4.2 ln 是从哪来的？（完整推导）

**ln 不是为了方便才取的，它是从推导里自动长出来的。**

从无偏条件出发：

$$\int \hat\theta(\mathbf{x})\,p(\mathbf{x};\theta)\,d\mathbf{x}=\theta$$

两边对 θ 求导（$\hat\theta(\mathbf{x})$ 不含 θ）：

$$\int \hat\theta(\mathbf{x})\,\frac{\partial p}{\partial\theta}\,d\mathbf{x}=1$$

**问题**：左边不是一个期望（期望必须是"某量 × $p$ 再积分"）。为了凑出 $p$，用恒等式：

$$\frac{\partial p}{\partial\theta}=p\cdot\frac{1}{p}\frac{\partial p}{\partial\theta}=p\cdot\frac{\partial \ln p}{\partial\theta}$$

**⟵ ln 就是从这里来的。** 取对数的作用是：把"密度的**绝对**变化率"换成"**相对**变化率"，从而自动带出权重 $p$。

于是 $E[\hat\theta\,s]=1$，其中 $s\triangleq\dfrac{\partial\ln p}{\partial\theta}$ 称为 **score（得分函数）**。

### 4.3 正则条件的来历

同样的技巧用在 $\int p\,d\mathbf{x}=1$ 上：

$$E[s]=\int\frac{\partial\ln p}{\partial\theta}p\,d\mathbf{x}=\int\frac{\partial p}{\partial\theta}d\mathbf{x}=\frac{\partial}{\partial\theta}\int p\,d\mathbf{x}=\frac{\partial(1)}{\partial\theta}=0$$

**所以正则条件本质上是"求导与积分可交换"的技术要求。**

### 4.4 用 Cauchy–Schwarz 收尾

由 $E[s]=0$ 得 $\mathrm{cov}(\hat\theta,s)=E[\hat\theta s]-E[\hat\theta]E[s]=1$。再由 $\mathrm{cov}^2(X,Y)\le\mathrm{var}(X)\mathrm{var}(Y)$：

$$1\le\mathrm{var}(\hat\theta)\cdot\underbrace{\mathrm{var}(s)}_{=\,I(\theta)}\ \Longrightarrow\ \mathrm{var}(\hat\theta)\ge\frac{1}{I(\theta)}$$

**Cauchy–Schwarz 取等号的条件是 $\hat\theta-\theta$ 与 $s$ 成比例——这正是可达条件 (3.7) 的来源。**

### 4.5 与 MLE 的关系

同一个对数似然，两种用法：

| | 操作 | 性质 |
|---|---|---|
| **MLE** | 令 $s=0$，解出 $\hat\theta$ | 对**具体一组数据**操作，结果是随机的 |
| **CRLB** | 对 $s$ **平方再求期望**（对所有可能数据平均） | 确定的函数，描述模型平均能提供多少信息 |

深层联系：**MLE 是渐近有效的**——$N\to\infty$ 时 MLE 渐近无偏且方差趋于 CRLB（第 7 章）。

---

## 5. Fisher 信息：怎么算、为什么能提前算

### 5.1 三步配方

$$I(\theta)=-E\left[\frac{\partial^2\ln p(\mathbf{x};\theta)}{\partial\theta^2}\right]$$

1. 写出 $\ln p(\mathbf{x};\theta)$
2. 对 θ **求两次导**
3. 取期望——**用模型已知的矩**（如 $E[w[n]]=0$、$E[w^2[n]]=\sigma^2$），再加负号

### 5.2 三类例子（按难度递增）

**例 A：二阶导里根本没有 x（最省事）— Example 3.3**

$$\frac{\partial\ln p}{\partial A}=\frac{1}{\sigma^2}\sum_n(x[n]-A)=\frac{N}{\sigma^2}(\bar x-A),\qquad \frac{\partial^2\ln p}{\partial A^2}=-\frac{N}{\sigma^2}$$

二阶导是常数，$\mathbf{x}$ 全消失，期望免费：$I(A)=N/\sigma^2$。
（同时一阶导已是 (3.7) 形式，$g(\mathbf{x})=\bar x$ ⟹ 样本均值是 MVU，$\mathrm{var}=\sigma^2/N$。）

**例 B：含 x，但被零均值噪声消掉（最典型）— 通式 (3.14)**

见第 7 节详细推导。关键：$E[x[n]-s[n;\theta]]=E[w[n]]=0$，含数据的那一整项归零。

**例 C：需要用到二阶矩 — Example 3.6 估计 $\sigma^2$**

$$\frac{\partial^2\ln p}{\partial(\sigma^2)^2}=\frac{N}{2\sigma^4}-\frac{1}{\sigma^6}\sum_n(x[n]-A)^2$$

用 $E[(x[n]-A)^2]=\sigma^2$：

$$E[\cdot]=\frac{N}{2\sigma^4}-\frac{N\sigma^2}{\sigma^6}=-\frac{N}{2\sigma^4}\ \Longrightarrow\ I(\sigma^2)=\frac{N}{2\sigma^4},\quad \mathrm{var}(\widehat{\sigma^2})\ge\frac{2\sigma^4}{N}$$

### 5.3 两个等价公式，用哪个？

$$I(\theta)=E\left[\left(\frac{\partial\ln p}{\partial\theta}\right)^2\right]=-E\left[\frac{\partial^2\ln p}{\partial\theta^2}\right]\tag{3.23}$$

**实践中几乎总用二阶导版本**——二阶导常常不含 $\mathbf{x}$（如例 A），期望白送；一阶导平方总要展开算矩，麻烦得多。

### 5.4 为什么能"提前"算出来 ⭐

这是最关键的概念问题。答案在于**期望符号把数据积分掉了**：

$$I(\theta)=-\int\frac{\partial^2\ln p(\mathbf{x};\theta)}{\partial\theta^2}\,p(\mathbf{x};\theta)\,d\mathbf{x}$$

$\partial^2\ln p/\partial\theta^2$ 确实是随机变量，但 $\int(\cdot)p\,d\mathbf{x}$ **对所有可能出现的数据集做了加权平均**，算完 $\mathbf{x}$ 已不在结果里，只剩 θ 和模型参数（$\sigma^2$、$N$）。

> **它是"模型的属性"，不是"某次实验的属性"。**
> 类比：你不用真的掷骰子，就能算出均匀骰子点数的方差是 35/12——因为你知道它的概率模型。

物理含义可以这样念：

> "**如果**真值是 θ，那么在它会产生的所有可能数据集上，对数似然的**平均曲率**是多少。"

注意 **θ 没有被积掉**，它作为自由变量留在答案里。所以得到的是一条**函数曲线** $I(\theta)$——你一次性把"真值取遍所有可能"的情形都算完了。这正是图 2.5 的虚线、图 3.3 的起伏曲线的由来。

### 5.5 可加性

独立样本的 Fisher 信息**可加**：$I_N(\theta)=N\cdot I_1(\theta)$（因为 $\ln p$ 是连加，求导和期望都保持可加）。这既是计算捷径，也解释了 CRLB 中 $1/N$ 因子的来源：**每多一个独立样本，就多贡献一份等量的信息**。

---

## 6. 可达条件与有效估计量

### 6.1 (3.7) 的几何图像：对数似然是一条抛物线 ⭐

把 score 看成 **θ 的函数**：

$$s(\theta)=I(\theta)\big(g(\mathbf{x})-\theta\big)$$

这是一条**直线**，斜率 $-I(\theta)$，过零点在 $\theta=g(\mathbf{x})$。导数是直线 ⟹ **对数似然本身是抛物线**：

$$\ln p(\mathbf{x};\theta)=\text{const}(\mathbf{x})-\frac{I}{2}\big(\theta-g(\mathbf{x})\big)^2$$

于是全部含义都清楚了：

| 元素 | 含义 |
|---|---|
| $g(\mathbf{x})$ | **抛物线顶点的位置**。数据变了，整条抛物线左右平移，顶点跟着数据走 |
| $I(\theta)$ | **抛物线的开口（曲率）**，**不随数据变** ⟹ 精度固定、事先可知 |
| 数据的作用 | 只负责"指定顶点位置"，其余形状不变 |

(3.7) 的苛刻之处：**θ 只能以"孤零零被减掉"的方式出现**，外面再乘一个纯 θ 的系数。数据和参数必须干净地分离。

### 6.2 $g(\mathbf{x})$ 到底是什么

**它就是把 score 因式分解后剩下的那个"只含数据、不含 θ"的函数**。不是你事先挑的，而是算出来的。

`θ̂ = g(x)` 这一步是**定义/选择**，不是推导出来的——定理在宣布"把估计量取成这个函数"。定理的实质内容是：**这样取出来的估计量恰好无偏、且方差正好等于 $1/I(\theta)$**。

为什么这是唯一合理的选择？三个角度：

1. **抛物线顶点**：令 score $=0$（MLE）⟹ $\theta=g(\mathbf{x})$。数据唯一"指认"出来的那个 θ 值
2. **零点应在真值附近**：正则条件说在真值处 $E[s]=0$，而 $g(\mathbf{x})$ 正是本次数据给出的零点
3. **Cauchy–Schwarz 等号条件**：要求 $\hat\theta-\theta=\frac{1}{I(\theta)}s$，对照可知 $\hat\theta$ 只能是 $g(\mathbf{x})$

> 📌 $g(\mathbf{x})$ **不含 θ** 是关键——这才使它能当估计量用。含 θ 的表达式你算不出来。
> 📌 MVU 估计量（在几乎处处意义下）**唯一**，所以不存在"另一个也能达到下界的估计量"。

### 6.3 三个"白送"的性质

从 (3.7) 出发，三件事不用另外验证：

**① 一定无偏**。由 $E[s]=0$：

$$0=E\big[I(\theta)(g-\theta)\big]=I(\theta)\big(E[g]-\theta\big)\ \Longrightarrow\ E[g(\mathbf{x})]=\theta$$

**② 分解出的乘子就是 Fisher 信息**。设分解为 $s=c(\theta)(g-\theta)$，则

$$-E\left[\frac{\partial s}{\partial\theta}\right]=-E\big[c'(\theta)(g-\theta)-c(\theta)\big]=-c'(\theta)\underbrace{E[g-\theta]}_{=0}+c(\theta)=c(\theta)$$

**所以不需要事先知道 $I(\theta)$，随手分解出的系数就是它。**

**③ 方差正好等于下界**：$\mathrm{var}(s)=I(\theta)$ 且 $\mathrm{var}(s)=I^2(\theta)\mathrm{var}(g)$ ⟹ $\mathrm{var}(g)=1/I(\theta)$。

无偏 + 方差达到 CRLB ⟹ 它就是 MVU。**这就是"CRLB 理论顺带把估计量给出来"的意思。**

### 6.4 式 (3.10) 那半页证明在干什么

它在补一个**记号上的漏洞**：定理 3.1 说 (3.7) 中的 $I$ 只是 "some function"，凭什么它就等于 $-E[\partial^2\ln p/\partial\theta^2]$？上面 ② 就是答案（书上用 $\hat\theta$ 代替 $g(\mathbf{x})$ 走了一遍）。

两个关键点：

- $\hat\theta=g(\mathbf{x})$ 不含 θ，所以 $\partial\hat\theta/\partial\theta=0$，乘积法则只出两项
- **无偏性杀掉了 $I'(\theta)$ 那一项**，哪怕 $I(\theta)$ 随 θ 变化也无妨

**实用价值**：若 (3.7) 能配出来，**不必再算二阶导和期望，直接读系数**。Example 3.3 一次求导即同时拿到估计量、Fisher 信息、最小方差，并已证明是 MVU。

### 6.5 配不出来怎么办

若 θ 缠在数据里出不来（如 Example 3.4 相位估计、Example 3.5 频率估计），则**有效估计量不存在**。此时：

- CRLB 仍可算，作为**性能基准**
- 找 MVU 需转第 5 章 **RBLS 定理**（充分统计量）
- 或退而求其次：第 6 章 **BLUE**（限定线性）、第 7 章 **MLE**（渐近有效）

---

## 7. WGN 中信号的通用 CRLB（3.5 节）

### 7.1 模型与推导

$$x[n]=s[n;\theta]+w[n],\qquad w[n]\sim\text{WGN}(0,\sigma^2),\qquad n=0,\dots,N-1$$

记 $s'[n]\triangleq\partial s[n;\theta]/\partial\theta$，$s''[n]\triangleq\partial^2 s[n;\theta]/\partial\theta^2$。

**一阶导**（链式法则，内导数带负号，两个负号相消）：

$$\frac{\partial\ln p}{\partial\theta}=\frac{1}{\sigma^2}\sum_{n=0}^{N-1}\big(x[n]-s[n;\theta]\big)s'[n]$$

**二阶导**（乘积法则，两个因子都含 θ）：

$$\frac{\partial}{\partial\theta}\Big[(x[n]-s)s'\Big]=\underbrace{(-s')\cdot s'}_{\text{第一因子求导}}+\underbrace{(x[n]-s)\cdot s''}_{\text{第二因子求导}}$$

$$\frac{\partial^2\ln p}{\partial\theta^2}=\frac{1}{\sigma^2}\sum_{n=0}^{N-1}\Big\{\big(x[n]-s[n;\theta]\big)s''[n]-\big(s'[n]\big)^2\Big\}$$

### 7.2 取期望：为什么结果只剩信号 ⭐

**先分清谁是随机的：**

| 量 | 随机吗 | 理由 |
|---|---|---|
| $x[n]$ | **是** | 含噪声 |
| $s[n;\theta]$、$s'[n]$、$s''[n]$ | 否 | 已知信号模型及其导数，只是 $n,\theta$ 的确定函数 |
| $\sigma^2,N$ | 否 | 模型参数 |

**整个二阶导里唯一的随机成分是 $x[n]$，且以一次方（线性）出现**——这意味着只需噪声的**一阶矩**。

**第一项**：$s''[n]$ 确定可提出，而

$$x[n]-s[n;\theta]=w[n]\ \Longrightarrow\ E\big[x[n]-s[n;\theta]\big]=E[w[n]]=0$$

**⟹ 整块归零**，$s''$ 无论多复杂都无所谓。

**第二项**：$(s'[n])^2$ 完全确定，期望就是自身。

$$E\left[\frac{\partial^2\ln p}{\partial\theta^2}\right]=-\frac{1}{\sigma^2}\sum_{n=0}^{N-1}\big(s'[n]\big)^2$$

$$\boxed{\mathrm{var}(\hat\theta)\ \ge\ \frac{\sigma^2}{\displaystyle\sum_{n=0}^{N-1}\Big(\frac{\partial s[n;\theta]}{\partial\theta}\Big)^2}}\tag{3.14}$$

### 7.3 ⚠️ 关键细节：为什么 $x[n]-s[n;\theta]$ 恰好是噪声

这依赖定理 3.1 里一句容易被略过的话：

> *"the derivative is evaluated at the **true value of θ** and the expectation is taken with respect to $p(\mathbf{x};\theta)$"*

**两处的 θ 是同一个值。** 求导后代入的 θ 是真值，取期望时数据分布也由这同一个真值产生，于是 $E_\theta[x[n]]=s[n;\theta]$，残差正好是纯噪声。

若代入 $\theta'\ne\theta$：

$$x[n]-s[n;\theta']=\underbrace{s[n;\theta]-s[n;\theta']}_{\ne0\text{，确定性偏差}}+w[n]$$

均值不为零，第一项**不会消失**，(3.14) 也就不成立。

> 所以"在真值处求值"不是可有可无的措辞，而是这步化简的前提。这也解释了 CRLB 为什么是 θ 的函数：每个候选真值对应一次独立的计算。

### 7.4 交叉验证：换一条路算

用 $I(\theta)=E[(\partial\ln p/\partial\theta)^2]$，把一阶导写成噪声形式 $\frac{1}{\sigma^2}\sum_n w[n]s'[n]$：

$$I(\theta)=\frac{1}{\sigma^4}\sum_n\sum_m s'[n]s'[m]\underbrace{E[w[n]w[m]]}_{=\sigma^2\delta[n-m]}=\frac{1}{\sigma^2}\sum_n(s'[n])^2\quad\checkmark$$

两条路径用到的假设不同，很有启发：

| 路径 | 用到的噪声假设 |
|---|---|
| 二阶导 | 仅 $E[w[n]]=0$（**零均值**） |
| 一阶导平方 | $E[w[n]w[m]]=\sigma^2\delta[n-m]$（零均值 + **白**，交叉项因不相关而消失） |

**高斯性**在更早就用掉了——它决定了 $\ln p$ 是二次型。

### 7.5 结果怎么读：几何图像

$$\mathrm{var}(\hat\theta)\ \ge\ \frac{\text{噪声功率}}{\text{信号对参数的敏感度能量}}$$

把 $\mathbf{s}(\theta)=[s[0;\theta],\dots,s[N-1;\theta]]^T$ 看成 $\mathbb{R}^N$ 中随 θ 移动的**曲线**：

- $\mathbf{s}'(\theta)$ 是切向量，$\|\mathbf{s}'\|^2=\sum(s'[n])^2$ 是曲线的**移动速度**
- 噪声把观测点模糊成半径约 $\sigma$ 的球
- **速度快 ⟹ 不同 θ 对应的信号点拉得开 ⟹ 噪声球不重叠 ⟹ 好估**

> **CRLB = 噪声球半径 ÷ 曲线速度。** 这就是 Kay 那句 "Signals that change rapidly as the unknown parameter changes result in accurate estimators" 的数学形式。

💡 结构性观察：**曲线的弯曲程度 $s''$ 完全不影响 CRLB**，它在平均意义下被噪声抹掉了。但对**某一次具体的数据**，$\partial^2\ln p/\partial\theta^2$ 里确实还挂着 $w[n]s''[n]$——观测曲率围绕平均曲率随机起伏，Fisher 信息取的是**平均值**。这再次说明 $E[\cdot]$ 不是装饰。

### 7.6 例题速查表

| 例 | 参数 | $s[n;\theta]$ | $\partial s/\partial\theta$ | $\sum(\partial s/\partial\theta)^2$ | CRLB |
|---|---|---|---|---|---|
| 3.3 | DC 电平 $A$ | $A$ | $1$ | $N$ | $\sigma^2/N$ |
| 3.4 | 相位 $\phi$ | $A\cos(2\pi f_0n+\phi)$ | $-A\sin(2\pi f_0n+\phi)$ | $\approx NA^2/2$ | $2\sigma^2/(NA^2)$ |
| 3.5 | 频率 $f_0$ | $A\cos(2\pi f_0n+\phi)$ | $-2\pi nA\sin(2\pi f_0n+\phi)$ | $A^2\sum[2\pi n\sin(\cdot)]^2$ | 式 (3.15) |
| 3.6 | 方差 $\sigma^2$ | — | — | — | $2\sigma^4/N$ |
| 3.7 | 截距 $A$（$B$ 未知） | $A+Bn$ | $1$ | — | $\dfrac{2(2N-1)\sigma^2}{N(N+1)}$ |
| 3.7 | 斜率 $B$（$A$ 未知） | $A+Bn$ | $n$ | — | $\dfrac{12\sigma^2}{N(N^2-1)}$ |

> 频率行的 $n$ 因子说明为什么**频率比相位好估得多**（$1/N^3$ vs $1/N$）：时间越靠后的采样点对频率误差越敏感，相位误差随 $n$ 线性累积。同样的机制解释了 Example 3.7 里斜率 $B$ 比截距 $A$ 好估。
>
> Example 3.7 还给出一条通则：**估计的参数越多，CRLB 越大**（$A$ 的界从 $\sigma^2/N$ 涨到 $\frac{2(2N-1)\sigma^2}{N(N+1)}$）。

---

## 8. Example 3.4 完整拆解（相位估计）

这是全章代数最繁的一例，专门列出。

### 8.1 记号

$$\alpha_n\triangleq 2\pi f_0n+\phi,\qquad \frac{\partial\alpha_n}{\partial\phi}=1,\qquad 4\pi f_0n+2\phi=2\alpha_n$$

### 8.2 求导公式表（注意内导数）

| 式子 | 对 φ 求导 | 内导数 |
|---|---|---|
| $\cos\alpha_n$ | $-\sin\alpha_n$ | $1$ |
| $\sin\alpha_n$ | $\cos\alpha_n$ | $1$ |
| $\sin2\alpha_n$ | $\mathbf{2}\cos2\alpha_n$ | $\mathbf{2}$ |
| $\cos2\alpha_n$ | $-\mathbf{2}\sin2\alpha_n$ | $\mathbf{2}$ |

> ⚠️ **那个 2 是后面所有系数对得上的关键**，漏了就全错。

### 8.3 三角恒等式：两条，都是积化和差的特例

$$\sin A\cos B=\tfrac12[\sin(A{+}B)+\sin(A{-}B)]\ \xrightarrow{A=B=\alpha}\ \boxed{\sin\alpha\cos\alpha=\tfrac12\sin2\alpha}\quad\text{(二倍角)}$$

$$\cos A\cos B=\tfrac12[\cos(A{+}B)+\cos(A{-}B)]\ \xrightarrow{A=B=\alpha}\ \boxed{\cos^2\alpha=\tfrac12+\tfrac12\cos2\alpha}\quad\text{(降幂)}$$

> **"积化和差"和"二倍角"在这里是同一条公式的两次使用**：把两个正弦量的乘积拆成"**直流项 + 二倍频项**"。这是整个推导的物理主线。

### 8.4 六步推导

**① 一阶导**（链式法则，$-A\cdot(-\sin\alpha_n)=+A\sin\alpha_n$，系数 2 与 $\frac{1}{2\sigma^2}$ 约掉）：

$$\frac{\partial\ln p}{\partial\phi}=-\frac{1}{\sigma^2}\sum_n\big[x[n]-A\cos\alpha_n\big]A\sin\alpha_n$$

**② 展开 + 二倍角**（信号自乘产生二倍频分量）：

$$=-\frac{A}{\sigma^2}\sum_n\Big[x[n]\sin\alpha_n-\frac{A}{2}\sin2\alpha_n\Big]$$

**③ 二阶导**（$\frac12$ 被内导数的 2 吃掉，所以系数是干净的 $A$）：

$$\frac{\partial^2\ln p}{\partial\phi^2}=-\frac{A}{\sigma^2}\sum_n\big[x[n]\cos\alpha_n-A\cos2\alpha_n\big]$$

**④ 取负期望**（$E[x[n]]=A\cos\alpha_n$，平方项出现）：

$$-E\left[\frac{\partial^2\ln p}{\partial\phi^2}\right]=\frac{A}{\sigma^2}\sum_n\big[A\cos^2\alpha_n-A\cos2\alpha_n\big]$$

**⑤ 降幂公式**：

$$=\frac{A^2}{\sigma^2}\sum_n\Big[\underbrace{\tfrac12}_{\text{直流}}+\tfrac12\cos2\alpha_n-\cos2\alpha_n\Big]=\frac{A^2}{\sigma^2}\left[\frac{N}{2}-\frac12\sum_n\cos(4\pi f_0n+2\phi)\right]$$

**到这里完全精确，没有任何近似。**

**⑥ 二倍频项的抵消**（唯一的近似）：

由几何级数求和（Dirichlet 核）：

$$\left|\sum_{n=0}^{N-1}\cos(4\pi f_0n+2\phi)\right|=\left|\frac{\sin(2\pi f_0N)}{\sin(2\pi f_0)}\right|\le\frac{1}{|\sin(2\pi f_0)|}$$

右边**与 $N$ 无关，是有界常数**，除以 $N$ 后趋于 0。

> **直觉**：余弦累加很多个周期，正负半周互相抵消，只剩末尾不满一周期的零头（$O(1)$），而直流项累积成 $O(N)$。

$$I(\phi)\approx\frac{NA^2}{2\sigma^2}\ \Longrightarrow\ \boxed{\mathrm{var}(\hat\phi)\ge\frac{2\sigma^2}{NA^2}=\frac{1}{N\eta}},\qquad \eta\triangleq\frac{A^2}{2\sigma^2}\ \text{(SNR)}$$

**相位估计精度只取决于总信噪比 $N\eta$，与频率 $f_0$ 无关**（只要不在 0 或 1/2 附近）。

### 8.5 为什么要求 $f_0$ 不接近 0 或 1/2

因为分母 $\sin(2\pi f_0)$ 在这两处为零。此时 $2f_0$ 落在整数倍频，$\cos(4\pi f_0n+2\phi)$ 退化成常数，**不振荡、不抵消**。

取 $f_0\to0$ 精确计算：

$$I(\phi)=\frac{A^2}{\sigma^2}\cdot\frac{N}{2}(1-\cos2\phi)=\frac{NA^2\sin^2\phi}{\sigma^2}$$

在 $\phi=0$ 处 $I=0$，CRLB 发散——**相位完全不可估**。物理上合理：$f_0=0$ 时信号是常数 $A\cos\phi$，而 $\phi=0$ 恰是余弦极值点，$\phi$ 的一阶扰动不改变信号。

### 8.6 捷径：用 (3.14) 三行搞定

$$s[n;\phi]=A\cos\alpha_n\ \Rightarrow\ \frac{\partial s}{\partial\phi}=-A\sin\alpha_n\ \Rightarrow\ I(\phi)=\frac{A^2}{\sigma^2}\sum_n\sin^2\alpha_n\approx\frac{A^2}{\sigma^2}\cdot\frac{N}{2}$$

（用了 $\overline{\sin^2}=1/2$，还是同一条降幂公式。）**(3.14) 已经把"期望消掉含数据项"这一步一次性做完了。**

### 8.7 这个例子的真正用意

看 ② 式的 score：**φ 被锁在 $\sin(\cdot)$ 里面，与数据 $x[n]$ 缠在一起，无论如何配不成 $I(\phi)(g(\mathbf{x})-\phi)$。**

⟹ 按定理 3.1 的"当且仅当"：**有效估计量不存在，CRLB 够不着。** 这就是 Kay 预告的 "the CRLB is not always satisfied"，对应图 2.5 里 $\hat\theta_1$ 贴不到虚线的情形。

---

## 9. 参数变换（3.6 节）

### 9.1 这一节在干什么

- **3.5**：在具体模型下**怎么把 CRLB 算出来**
- **3.6**：CRLB 已算好，但**你真正想估的不是模型里那个参数，而是它的某个函数**——界怎么换算，代价是什么

**它不是新的推导方法，而是一个换算规则 + 一条警告。**

### 9.2 动机：模型参数 ≠ 你关心的量

模型 $x[n]=A+w[n]$ 里天然出现的是 $A$，但实际可能关心：

- **信号功率** $A^2$（雷达回波强度）
- **分贝值** $20\log_{10}|A|$
- 阵列测向中模型参数是空间频率 $u=\sin\theta$，你要的是**角度** $\theta$
- 模型参数是 $\sigma^2$，你要**标准差** $\sigma$

难道每换一个关心的量就要重写似然、重新求二阶导？**3.6 说：不用。**

### 9.3 规则 (3.16)：就是误差传播公式

若 $\alpha=g(\theta)$：

$$\mathrm{var}(\hat\alpha)\ \ge\ \frac{\big(\partial g/\partial\theta\big)^2}{I(\theta)}=\Big(\frac{\partial g}{\partial\theta}\Big)^2\cdot\mathrm{CRLB}(\theta)\tag{3.16}$$

**Fisher 信息只算一次**（在最方便的参数化下），换算时乘一个 $(g')^2$。

> 本质就是一阶**误差传播**：$\delta\alpha\approx g'(\theta)\delta\theta$，两边平方取期望，方差乘 $(g')^2$。
>
> **生活化类比**：卡尺测半径精度 $\pm0.1$ mm，问圆面积精度？$S=\pi r^2$，$dS/dr=2\pi r$，所以 $\sigma_S=2\pi r\cdot0.1$。**不需要重新标定一把"测面积的尺子"。**

书上的例子：$I(A)=N/\sigma^2$，$g(A)=A^2$，$g'=2A$：

$$\mathrm{var}(\widehat{A^2})\ \ge\ \frac{(2A)^2}{N/\sigma^2}=\frac{4A^2\sigma^2}{N}\tag{3.17}$$

> 📌 注意结果里出现的是**原参数 $A$**（"the CRLB is expressed in terms of θ"）。必然如此，因为 Fisher 信息本来就是关于 θ 定义的。

### 9.4 代价：非线性变换毁掉有效性 ⚠️

$\bar x$ 对 $A$ 是有效估计量。那么估 $A^2$ 时直接代入，用 $\bar x^2$ 行不行？

**不行——它连无偏都不是**：

$$E[\bar x^2]=E^2[\bar x]+\mathrm{var}(\bar x)=A^2+\frac{\sigma^2}{N}\ne A^2\tag{3.18}$$

**偏差从哪来？** 二阶 Taylor 展开一目了然：

$$g(\bar x)\approx g(A)+g'(A)(\bar x-A)+\tfrac12g''(A)(\bar x-A)^2$$

取期望，一阶项因无偏而消失：

$$E[g(\bar x)]\approx g(A)+\underbrace{\tfrac12 g''(A)\,\mathrm{var}(\bar x)}_{\text{偏差}}$$

代入 $g''=2$、$\mathrm{var}(\bar x)=\sigma^2/N$，正好得到 $\sigma^2/N$ ✓

> **根源是 $g$ 的弯曲（$g''\ne0$）**：估计值在真值两侧随机抖动，经弯曲函数映射后两侧不再对称抵消，系统性偏向凸的一边（**Jensen 不等式**：$g$ 凸时 $E[g(\hat\theta)]\ge g(E[\hat\theta])$）。**线性函数没有弯曲，不受影响。**

即使去偏成 $\bar x^2-\sigma^2/N$，方差仍是

$$\frac{4A^2\sigma^2}{N}+\frac{2\sigma^4}{N^2}\ >\ \underbrace{\frac{4A^2\sigma^2}{N}}_{\text{CRLB}}$$

**有效性确实丢了，不只是无偏性的问题。**

### 9.5 线性（仿射）变换则完好无损

$\alpha=a\theta+b$，取 $\hat\alpha=a\hat\theta+b$：

- 无偏：$E[a\hat\theta+b]=a\theta+b=\alpha$ ✓
- 方差：$\mathrm{var}(a\hat\theta+b)=a^2\mathrm{var}(\hat\theta)$
- CRLB 按 (3.16) 也乘 $a^2$

**两边同步缩放，等号保持。** 单位换算、加偏置这类操作是安全的。

### 9.6 大样本下近似恢复：统计线性化（图 3.4）

$N$ 增大 ⟹ $\bar x$ 的 PDF 集中在 $A\pm3\sigma/\sqrt N$ 的小区间 ⟹ **在这小区间内，再弯的 $g$ 也近似是直的** ⟹ 非线性退化为线性，无偏性与有效性近似恢复：

$$\mathrm{var}(\bar x^2)=\frac{4A^2\sigma^2}{N}+\underbrace{\frac{2\sigma^4}{N^2}}_{\text{比第一项快一阶趋于}0}\ \longrightarrow\ \text{CRLB}\tag{3.19}$$

⟹ $\bar x^2$ 是 $A^2$ 的**渐近有效**估计量。实践中"直接代入"通常可接受，但要知道自己在做近似，且 $N$ 小时它是有偏的。

### 9.7 小结表

| | 线性变换 $a\theta+b$ | 非线性变换 $g(\theta)$ |
|---|---|---|
| CRLB 换算 | $a^2\cdot$CRLB | $(g')^2\cdot$CRLB（(3.16)，**总成立**） |
| 无偏性 | 保持 | **破坏**，偏差 $\approx\frac12g''\cdot\mathrm{var}(\hat\theta)$ |
| 有效性 | 保持 | **破坏**，但 $N\to\infty$ 渐近恢复 |
| 直接代入 $g(\hat\theta)$ | 放心用 | 小样本当心，大样本可用 |

> **一句话记住 3.6：界可以用链式法则换算，但"最优性"不能跟着一起搬家。**

### 9.8 它在全书中的位置

1. **通向第 7 章 MLE**：MLE 有**不变性**——$g(\theta)$ 的 MLE 就是 $g(\hat\theta_{\text{MLE}})$，直接代入即可。3.6 解释了为什么这个性质在有限样本下只是近似、大样本下才严格有效
2. **通向 3.7/3.8 向量版**：多参数下 $(g')^2$ 换成 Jacobian 夹逼 $\frac{\partial\mathbf{g}}{\partial\boldsymbol\theta}\mathbf{I}^{-1}(\boldsymbol\theta)\frac{\partial\mathbf{g}}{\partial\boldsymbol\theta}^T$（式 3.30）

---

## 10. 概念澄清：我们提前知道真值吗？ ⭐

这是学 CRLB 最关键的一道坎。**不知道，但"分析性能"和"做估计"是两件事。**

| | 谁 | 知道 θ 吗 | 在干什么 |
|---|---|---|---|
| **估计** | 系统/算法（运行时） | **不知道** | 拿到数据，算出 $\hat\theta=g(\mathbf{x})$ |
| **性能分析** | 工程师（设计时，纸上） | **假设**它是某值 | 回答"如果真值是 θ，这套方案能准到什么程度" |

**运行估计器时完全不需要 θ**——$\hat\theta=\bar x$ 这个公式里没有 θ，只有数据。这正是要求 $g(\mathbf{x})$ 只含数据的原因。

而 CRLB 是一个**条件命题**：

> "假如真值是 θ，那么任何无偏估计量的方差不会低于 $1/I(\theta)$。"

这是设计阶段在纸上做的推演。这也解释了图 2.5 的虚线为什么画成 **θ 的函数**——它遍历了所有可能的真值。

### 类比

游标卡尺说明书写"精度 ±0.02 mm"：

- 这是**仪器的规格**，厂家不知道你要测什么就标定好了
- 你测未知零件，读数 12.34 mm。不知道真值，但知道真值大概率在 $12.34\pm0.02$ 内

**CRLB 就是估计问题的"精度规格"，$\hat\theta$ 才是"读数"。**

### 那这个规格有什么用？

**① 可行性论证（工程上最值钱）**
造任何东西之前就能回答"能不能达标"。如 $\mathrm{var}(\hat A)\ge\sigma^2/N$：要求标准差 $\le0.01$、$\sigma=1$，立刻得 $N\ge10^4$。**如果 CRLB 都达不到指标，方案物理上不可能实现，趁早改设计，别浪费三个月调算法。**

**② 判断算法还有没有优化空间**
仿真方差是 $1.02\sigma^2/N$ 而 CRLB 是 $\sigma^2/N$ ⟹ 收工，没有无偏估计量能更好。若是 CRLB 的 10 倍 ⟹ 有信息没榨干。**没有 CRLB，你永远不知道该停在哪。**

**③ 指出"哪里难估、为什么难"**
Example 3.5 告诉你低频段本质上难估（不是你算法烂）；Example 3.7 告诉你斜率比截距好估、参数越多界越大。这些直接指导**波形/系统设计**——既然性能取决于 $\sum(\partial s/\partial\theta)^2$，就把信号设计成对参数敏感的形状。

**④ 顺带给出估计量**——(3.7) 的分解。

### "CRLB 依赖未知的 θ"怎么办

1. **运气好，根本不依赖**。如 $\sigma^2/N$ 对所有 $A$ 相同（Example 3.2 特意写了 "for all A"）
2. **依赖就画出整条曲线**（图 3.3），按工作区间内**最坏情况**设计
3. **把估计值代回去**：用 $I(\hat\theta)^{-1}$ 作为本次测量的**误差棒**。实际系统（雷达、GPS、定位算法）报告的精度基本都这么来的

> 仿真时你**确实知道真值**（自己生成的），所以能算经验方差验证。真实部署时不知道——正因如此才需要一个**纯靠模型推导、不依赖实测**的性能理论。CRLB 让你省掉"先造出来再看行不行"的昂贵弯路。

---

## 11. 常见误区汇总

| ❌ 误区 | ✅ 正确 |
|---|---|
| 无偏就是好估计量 | 无偏只保证平均命中；方差大照样烂。看 mse = var + bias² |
| 平均更多估计能消除偏差 | 只能消方差。偏差是相干叠加，$n$ 个 $b$ 除以 $n$ 还是 $b$ |
| 似然函数是 θ 的概率 | 不是密度、不积分为 1、可大于 1。**只有相对大小有意义** |
| 图 3.1 横轴是数据 | 横轴是候选参数 $A$ |
| CRLB 达不到 ⟹ MVU 不存在 | 只是充分条件。贴到界上一定是 MVU；贴不上只说明这条路失败（图 2.5 的 $\hat\theta_1$） |
| CRLB 对所有估计量成立 | **只对无偏估计量**。有偏估计方差可低于 CRLB（极端例：$\hat\theta\equiv0$ 方差为零），代价是偏差。有偏版本分子要乘 $(1+\partial b/\partial\theta)^2$ |
| CRLB 需要先测量才能算 | 期望把数据积分掉了，它是**模型的属性**。纸上即可算出整条曲线 |
| (3.14) 对任何 θ 值都成立 | 必须在**真值处**求值，否则 $x[n]-s[n;\theta']$ 不是零均值，含数据项不消失 |
| 有效估计量的 $g$ 可以随便选 | $g$ 是因式分解**被迫剩下**的，且必须不含 θ。MVU 唯一 |
| 估 $g(\theta)$ 直接代入 $g(\hat\theta)$ 就行 | 非线性变换破坏无偏与有效（大样本才近似成立） |
| Fisher 信息越大，估计越差 | 反了。$I$ 大 ⟹ 似然尖 ⟹ 界 $1/I$ 小 ⟹ 越准 |

---

## 12. 公式速查表

### 基础

| 名称 | 公式 |
|---|---|
| 偏差 | $b(\theta)=E(\hat\theta)-\theta$ |
| MSE 分解 | $\mathrm{mse}(\hat\theta)=\mathrm{var}(\hat\theta)+b^2(\theta)$ |
| 平均 $n$ 个独立同方差无偏估计 | $E(\hat\theta)=\theta$，$\mathrm{var}(\hat\theta)=\mathrm{var}(\hat\theta_1)/n$ |

### CRLB 核心

| 名称 | 公式 |
|---|---|
| 正则条件 | $E\left[\dfrac{\partial\ln p}{\partial\theta}\right]=0$ for all $\theta$ |
| score | $s=\dfrac{\partial\ln p(\mathbf{x};\theta)}{\partial\theta}$，$E[s]=0$ |
| Fisher 信息 | $I(\theta)=-E\left[\dfrac{\partial^2\ln p}{\partial\theta^2}\right]=E\left[\left(\dfrac{\partial\ln p}{\partial\theta}\right)^2\right]$ |
| CRLB | $\mathrm{var}(\hat\theta)\ge1/I(\theta)$ |
| 可加性 | $I_N(\theta)=N\cdot I_1(\theta)$（独立样本） |
| 可达条件 | $\dfrac{\partial\ln p}{\partial\theta}=I(\theta)(g(\mathbf{x})-\theta)$ ⟹ $\hat\theta=g(\mathbf{x})$ 为 MVU |
| WGN 中信号通式 | $\mathrm{var}(\hat\theta)\ge\dfrac{\sigma^2}{\sum_n(\partial s[n;\theta]/\partial\theta)^2}$ |
| 参数变换 | $\mathrm{var}(\hat\alpha)\ge\dfrac{(\partial g/\partial\theta)^2}{I(\theta)}$，$\alpha=g(\theta)$ |
| 向量版 | $\mathbf{C}_{\hat{\boldsymbol\theta}}-\mathbf{I}^{-1}(\boldsymbol\theta)\ge0$，$[\mathbf{I}]_{ij}=-E\left[\dfrac{\partial^2\ln p}{\partial\theta_i\partial\theta_j}\right]$ |

### 常用数学工具

| 用途 | 公式 |
|---|---|
| ln 的来历 | $\dfrac{\partial p}{\partial\theta}=p\cdot\dfrac{\partial\ln p}{\partial\theta}$ |
| 二倍角 | $\sin\alpha\cos\alpha=\tfrac12\sin2\alpha$ |
| 降幂 | $\cos^2\alpha=\tfrac12+\tfrac12\cos2\alpha$，$\sin^2\alpha=\tfrac12-\tfrac12\cos2\alpha$ |
| 积化和差 | $\sin A\cos B=\tfrac12[\sin(A{+}B)+\sin(A{-}B)]$；$\cos A\cos B=\tfrac12[\cos(A{+}B)+\cos(A{-}B)]$ |
| 正弦求和（Dirichlet） | $\left\|\sum_{n=0}^{N-1}\cos(2\pi fn+\psi)\right\|\le\dfrac{1}{\|\sin\pi f\|}$（与 $N$ 无关） |
| 非线性变换偏差 | $E[g(\hat\theta)]\approx g(\theta)+\tfrac12g''(\theta)\mathrm{var}(\hat\theta)$ |
| 高斯四阶矩 | $\xi\sim\mathcal N(\mu,\sigma^2)$：$E[\xi^2]=\mu^2+\sigma^2$，$\mathrm{var}(\xi^2)=4\mu^2\sigma^2+2\sigma^4$ |
| 高斯对数似然 | $\ln p=-\frac{N}{2}\ln(2\pi\sigma^2)-\frac{1}{2\sigma^2}\sum_n(x[n]-s[n;\theta])^2$ |

---

## 13. 解题流程（拿到新问题按此走）

```
1. 写出 p(x;θ) → 取对数 → 求一阶导 ∂ln p/∂θ
        ↓
2. 【先试】能否配成 I(θ)·(g(x) − θ) ？
        ├─ 能 ──→ 同时读出：
        │         · I(θ) = 提出的系数
        │         · MVU 估计量 θ̂ = g(x)
        │         · 最小方差 = 1/I(θ)
        │         【收工】
        │
        └─ 不能 ─→ 3. 继续求二阶导，取期望得 I(θ)
                        （WGN 中的信号可直接套 (3.14) 跳过此步）
                        ↓
                   4. 得到 CRLB，作为性能基准使用
                        ↓
                   5. 有效估计量不存在。若仍要找 MVU：
                        · 第 5 章 RBLS（充分统计量）
                        · 第 6 章 BLUE（限定线性）
                        · 第 7 章 MLE（渐近有效，大样本首选）
        ↓
6. 若关心的是 α = g(θ)：套 (3.16) 乘 (∂g/∂θ)²
   ⚠️ 非线性时注意无偏/有效性会丢失
```

---

## 14. 与后续章节的连接

| 章节 | 内容 | 与本部分的关系 |
|---|---|---|
| 3.7–3.8 | 向量参数 CRLB、Fisher 信息矩阵 | 标量结论的矩阵推广；"参数越多界越大" |
| 3.9 | WSS 高斯过程的渐近 CRLB（基于 PSD） | 大数据记录下的实用形式 |
| 第 4 章 | 线性模型 | CRLB 必定可达的一大类模型 |
| 第 5 章 | 充分统计量、RBLS 定理 | CRLB 够不着时找 MVU 的第二条路 |
| 第 6 章 | BLUE | 限定线性，牺牲最优性换可解性 |
| 第 7 章 | MLE | **渐近无偏、渐近有效**（渐近达到 CRLB）+ **不变性**（呼应 3.6） |
| 第 10 章起 | 贝叶斯方法 | 记号从 $p(\mathbf{x};\theta)$ 变为 $p(\mathbf{x}\|\theta)$ + 先验；界变为贝叶斯 CRLB |

---

## 附：一页速记

> 1. **mse = var + bias²**，偏差平方相加无交叉项（正交分解）
> 2. **平均只压方差不压偏差** ⟹ 先强制无偏，再最小化方差 ⟹ MVU
> 3. **似然 = 把 PDF 反过来看**，固定数据、变参数，给候选 θ 打分
> 4. **精度 ← 似然的尖锐度 ← 对数似然的曲率 ← Fisher 信息 $I(\theta)$**
> 5. **ln 来自 $\partial p/\partial\theta = p\cdot\partial\ln p/\partial\theta$**，是为了把导数变回期望形式
> 6. **CRLB：$\mathrm{var}(\hat\theta)\ge1/I(\theta)$**，只对无偏估计量成立
> 7. **$I(\theta)$ 能提前算**，因为期望把数据积分掉了——它是模型的属性，不是实验的属性
> 8. **可达 ⟺ 对数似然恰为抛物线**，顶点 $g(\mathbf{x})$ 就是 MVU 估计量，开口 $I(\theta)$ 就是精度
> 9. **WGN 中：CRLB = 噪声功率 ÷ 信号对参数的敏感度能量**，$s''$ 被期望抹掉
> 10. **换参数：界乘 $(g')^2$，但最优性不跟着搬家**
