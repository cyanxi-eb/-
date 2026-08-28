#!/usr/bin/env node
/**
 * fix-ds.cjs — 补全 bh-mindmaps 并入的过短/纯链接题（数据结构算法 + 软技能）
 * 用法: node tools/fix-ds.cjs
 * 说明: 读取 questions.json，对指定 code 覆盖 answer/extend，写回。
 */
const fs = require('fs');
const path = require('path');
const DATA = path.join(__dirname, '..', 'questions.json');

const FIX = {
  // ---- 纯 LeetCode 链接题 → 补全为完整题卡 ----
  'DS-4': {
    answer: [
      '**题目：** 给定整数数组 `nums` 和目标值 `target`，找出数组中和为目标值的两个整数，返回它们的下标（每个输入只对应一个答案，同一元素不能重复使用）。',
      '',
      '**思路：** 哈希表一次遍历——遍历时用字典存「值→下标」，对每个数 `x` 查 `target-x` 是否已在字典中，命中即返回。',
      '',
      '```python',
      'def twoSum(nums, target):',
      '    seen = {}',
      '    for i, x in enumerate(nums):',
      '        if target - x in seen:',
      '            return [seen[target - x], i]',
      '        seen[x] = i',
      '    return []',
      '```',
      '',
      '**复杂度：** 时间 O(n)，空间 O(n)。'
    ].join('\n'),
    extend: '**面试追问：** 暴力解法是双层循环 O(n²)；哈希表把查找 target-x 从 O(n) 降到 O(1)，是「以空间换时间」的典型。若要求返回值而非下标，可用排序+双指针。'
  },
  'DS-7': {
    answer: [
      '**题目：** 给定字符串 `s`，找出其中最长的回文子串。',
      '',
      '**思路（中心扩展）：** 回文关于中心对称，枚举每个可能的中心（单字符/相邻字符对），向两侧扩展直到不再回文。',
      '',
      '```python',
      'def longestPalindrome(s):',
      '    n, start, maxlen = len(s), 0, 0',
      '    def expand(l, r):',
      '        while l >= 0 and r < n and s[l] == s[r]:',
      '            l -= 1; r += 1',
      '        return l + 1, r - l - 1',
      '    for i in range(n):',
      '        l1, len1 = expand(i, i)      # 奇数长度中心',
      '        l2, len2 = expand(i, i + 1)  # 偶数长度中心',
      '        if len1 > maxlen: start, maxlen = l1, len1',
      '        if len2 > maxlen: start, maxlen = l2, len2',
      '    return s[start:start + maxlen]',
      '```',
      '',
      '**复杂度：** 时间 O(n²)，空间 O(1)。'
    ].join('\n'),
    extend: '**面试追问：** 也可用动态规划（dp[i][j] 表示 s[i:j+1] 是否回文，O(n²) 时间 O(n²) 空间）；还有 Manacher 算法可做到 O(n)。面试掌握中心扩展法足够。'
  },
  'DS-10': {
    answer: [
      '**题目：** 设计并实现 LRU（最近最少使用）缓存，支持 `get(key)` 和 `put(key, value)`，均需 O(1)。',
      '',
      '**思路：** 哈希表 + 双向链表。哈希表存「键→节点」实现 O(1) 查找；双向链表维护访问顺序，最近访问的放表头，容量满时删除表尾（最久未用）。',
      '',
      '```python',
      'class Node:',
      '    def __init__(self, k=0, v=0):',
      '        self.k, self.v, self.prev, self.next = k, v, None, None',
      '',
      'class LRUCache:',
      '    def __init__(self, capacity):',
      '        self.cap = capacity',
      '        self.cache = {}',
      '        self.head, self.tail = Node(), Node()',
      '        self.head.next, self.tail.prev = self.tail, self.head',
      '',
      '    def _remove(self, node):',
      '        node.prev.next, node.next.prev = node.next, node.prev',
      '',
      '    def _add(self, node):  # 加到表头',
      '        node.next, node.prev = self.head.next, self.head',
      '        self.head.next.prev = node',
      '        self.head.next = node',
      '',
      '    def get(self, key):',
      '        if key not in self.cache: return -1',
      '        node = self.cache[key]',
      '        self._remove(node); self._add(node)',
      '        return node.v',
      '',
      '    def put(self, key, value):',
      '        if key in self.cache: self._remove(self.cache[key])',
      '        node = Node(key, value)',
      '        self._add(node); self.cache[key] = node',
      '        if len(self.cache) > self.cap:',
      '            last = self.tail.prev',
      '            self._remove(last)',
      '            del self.cache[last.k]',
      '```',
      '',
      '**复杂度：** get / put 均 O(1)。'
    ].join('\n'),
    extend: '**面试追问：** 为什么不用单链表？——删除尾节点需要 O(1) 拿到前驱，单链表做不到，必须双向链表 + 头尾哨兵节点。Python 可直接用 `collections.OrderedDict` 实现。'
  },
  'DS-13': {
    answer: [
      '**题目：** 假设爬楼梯，每次可爬 1 或 2 阶，问爬到第 n 阶有多少种方法。',
      '',
      '**思路（动态规划）：** `dp[i] = dp[i-1] + dp[i-2]`（最后一步爬 1 阶或 2 阶），本质是斐波那契数列，用滚动变量优化空间。',
      '',
      '```python',
      'def climbStairs(n):',
      '    a, b = 1, 1',
      '    for _ in range(n - 1):',
      '        a, b = b, a + b',
      '    return b',
      '```',
      '',
      '**复杂度：** 时间 O(n)，空间 O(1)。'
    ].join('\n'),
    extend: '**面试追问：** 若每步可爬 1/2/3 阶，则 `dp[i]=dp[i-1]+dp[i-2]+dp[i-3]`；爬楼梯是动态规划最经典入门题，务必讲清「状态转移方程 + 边界 + 空间优化」。'
  },
  'DS-16': {
    answer: [
      '**题目：** 翻转一棵二叉树（左右子树互换）。',
      '',
      '**思路（递归）：** 交换当前节点的左右子节点，再递归翻转左右子树。',
      '',
      '```python',
      'def invertTree(root):',
      '    if not root: return None',
      '    root.left, root.right = root.right, root.left',
      '    invertTree(root.left)',
      '    invertTree(root.right)',
      '    return root',
      '```',
      '',
      '**复杂度：** 时间 O(n)，空间 O(h)（递归栈深度，最坏 O(n)）。'
    ].join('\n'),
    extend: '**面试追问：** 也可用层序遍历（BFS）迭代翻转，逐层交换左右子节点，空间 O(n)。递归写法更简洁，面试优先递归。'
  },
  'DS-19': {
    answer: [
      '**题目：** 反转一个单链表。',
      '',
      '**思路（迭代）：** 用 `prev` / `cur` 双指针，逐个把当前节点的 `next` 指向前驱。',
      '',
      '```python',
      'def reverseList(head):',
      '    prev, cur = None, head',
      '    while cur:',
      '        nxt = cur.next',
      '        cur.next = prev',
      '        prev = cur',
      '        cur = nxt',
      '    return prev',
      '```',
      '',
      '**复杂度：** 时间 O(n)，空间 O(1)。'
    ].join('\n'),
    extend: '**面试追问：** 递归写法：`head.next.next = head; head.next = None`，注意先保存 new_head；局部反转（反转第 m 到 n 个节点）需先定位到 m 前驱再反转。'
  },

  // ---- 过简题 → 补全 ----
  'DS-26': {
    answer: [
      '**答案：** 栈。',
      '',
      '**原因：** 递归本质是函数调用，每次调用需保存当前上下文（局部变量、返回地址），后调用的先返回——这正是「后进先出（LIFO）」特性，只有栈能实现。',
      '',
      '**延伸：** 递归也可显式用栈改写为迭代，例如二叉树的中序/前序遍历、图的 DFS 都可用栈模拟递归栈。'
    ].join('\n'),
    extend: '**面试追问：** 递归 vs 迭代——递归代码简洁但有栈溢出风险（深度过大），迭代用显式栈更可控；尾递归可被优化为循环。'
  },
  'DS-27': {
    answer: [
      '**常见排序算法及复杂度：**',
      '',
      '| 算法 | 最好 | 平均 | 最坏 | 空间 | 稳定 |',
      '|------|------|------|------|------|------|',
      '| 冒泡 | O(n) | O(n²) | O(n²) | O(1) | 稳定 |',
      '| 选择 | O(n²) | O(n²) | O(n²) | O(1) | 不稳定 |',
      '| 插入 | O(n) | O(n²) | O(n²) | O(1) | 稳定 |',
      '| 快排 | O(nlogn) | O(nlogn) | O(n²) | O(logn) | 不稳定 |',
      '| 归并 | O(nlogn) | O(nlogn) | O(nlogn) | O(n) | 稳定 |',
      '| 堆排 | O(nlogn) | O(nlogn) | O(nlogn) | O(1) | 不稳定 |',
      '',
      '**快排核心：** 分治 + 分区（选基准 pivot，小的放左、大的放右，递归两边）。',
      '**归并核心：** 分治 + 合并两个有序子数组。',
      '**补充：** Python 内置 `sorted()` / `list.sort()` 用 TimSort（归并 + 插入的混合），稳定。'
    ].join('\n'),
    extend: '**面试追问：** 快排最坏 O(n²) 出现在「已有序 + 固定选首元素为 pivot」时，随机化 pivot 可避免；快排是原地排序、归并需额外 O(n) 空间但稳定——根据场景权衡。'
  },
  'DS-34': {
    answer: [
      '**答案：** O(1)。',
      '',
      '**原因：** `set` 基于哈希表实现，元素键经过 hash 映射到固定桶位置，`in` 只需一次哈希查找，与元素个数无关。`dict` 的 key 同理。',
      '',
      '**注意：** O(1) 是平均复杂度，最坏情况（哈希严重冲突）退化为 O(n)。'
    ].join('\n'),
    extend: '**易错：** `list` 的 `in` 是 O(n)（逐个遍历比较），所以频繁的成员判断应优先用 set/dict；`set` 元素必须可哈希（不可变类型）。'
  },

  // ---- 软技能过简题 → 略扩展 ----
  'SK-4': {
    answer: [
      '**答案：**',
      '- 当天投递后一般需等待 3 天左右，先别焦虑',
      '- 主动到 Boss 直聘跟 HR / 技术负责人沟通，说明自己与岗位的匹配点，进一步预约面试',
      '- 投递后主动跟进是加分项，不是打扰；但注意频率，别刷屏'
    ].join('\n'),
    extend: '**面试追问：** 投递前先确认 JD 与简历匹配度；海投 + 精准投结合，避免只盯一家公司。'
  },
  'SK-5': {
    answer: [
      '**答案：** 讲项目抓住四要素：',
      '- **业务场景**：解决什么问题、为什么做',
      '- **项目架构**：整体技术架构、模块划分',
      '- **自己负责部分**：突出个人职责（少说「参与」，多说「负责」）',
      '- **优化及坑**：遇到的技术难题与解决方案（体现思考深度）'
    ].join('\n'),
    extend: '**面试追问：** 按「业务 → 架构 → 职责 → 难点」顺序讲，每段 1-2 句即可，别背稿；准备 2-3 个技术难点及解法。'
  },
};

function main() {
  const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  let count = 0;
  data.forEach(c => {
    const fix = FIX[c.code];
    if (fix) {
      c.answer = fix.answer;
      if (fix.extend) c.extend = fix.extend;
      if (c.source === 'bh') c.source = 'bh-fixed';
      count++;
    }
  });
  fs.writeFileSync(DATA, JSON.stringify(data, null, 2), 'utf8');
  console.log(`✓ 已补全 ${count} 道题：`);
  Object.keys(FIX).forEach(k => console.log('  ' + k));
  console.log('（source 标记为 bh-fixed，表示已人工补全）');
}

main();
