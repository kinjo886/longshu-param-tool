// 和Python chunk_rows 完全一致的数组分片
function chunkArray(arr, size) {
    const res = [];
    for (let i = 0; i < arr.length; i += size) {
        res.push(arr.slice(i, i + size));
    }
    return res;
}

// 全局缓存所有生成分组
let groupDataMap = {};
let groupNameList = [];
let currentPreviewName = "";

// DOM元素绑定
const batchSizeInput = document.getElementById('batchSize');
const inputArea = document.getElementById('inputArea');
const clearBtn = document.getElementById('clearBtn');
const resetAllBtn = document.getElementById('resetAllBtn');
const generateBtn = document.getElementById('generateBtn');
const groupList = document.getElementById('groupList');
const checkAll = document.getElementById('checkAll');
const batchDownloadBtn = document.getElementById('batchDownloadBtn');
const previewArea = document.getElementById('previewArea');
const copyBtn = document.getElementById('copyBtn');
const logArea = document.getElementById('logArea');

// ========== 本地持久化存储：永久保存，侧边栏销毁也不会丢失 ==========
const STORAGE_KEY = "tool_save_data";
// 保存当前全部状态
async function saveState() {
    const saveData = {
        inputText: inputArea.value,
        batchSize: batchSizeInput.value,
        groupDataMap,
        groupNameList,
        currentPreviewName,
        previewText: previewArea.value,
        logText: logArea.value
    };
    await chrome.storage.local.set({ [STORAGE_KEY]: saveData });
}
// 读取保存状态
async function loadState() {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    const saveData = data[STORAGE_KEY];
    if (!saveData) return false;

    // 恢复页面所有内容
    inputArea.value = saveData.inputText || "";
    batchSizeInput.value = saveData.batchSize || 10;
    previewArea.value = saveData.previewText || "";
    logArea.value = saveData.logText || "";

    groupDataMap = saveData.groupDataMap || {};
    groupNameList = saveData.groupNameList || [];
    currentPreviewName = saveData.currentPreviewName || "";

    if (groupNameList.length > 0) renderGroupList();
    return true;
}
// 彻底清空全部本地存储（手动重置按钮使用）
async function clearAllSavedState() {
    await chrome.storage.local.remove(STORAGE_KEY);
    // 清空页面内存
    inputArea.value = "";
    previewArea.value = "";
    logArea.value = "";
    groupDataMap = {};
    groupNameList = [];
    currentPreviewName = "";
    groupList.innerHTML = "";
}

// 日志输出
function log(msg) {
    logArea.value += msg + '\n';
    logArea.scrollTop = logArea.scrollHeight;
    saveState(); // 每次日志更新自动保存
}

// 单行按逗号分割、去除两端空格
function splitSingleLine(str) {
    return str.split(',').map(item => item.trim());
}

// 渲染分组勾选列表
function renderGroupList() {
    groupList.innerHTML = "";
    groupNameList.forEach(name => {
        const item = document.createElement("div");
        item.className = "group-item";
        item.innerHTML = `
            <input type="checkbox" class="group-check" value="${name}">
            <span>${name}</span>
        `;
        // 点击文件名切换预览
        item.querySelector("span").addEventListener("click", () => {
            currentPreviewName = name;
            previewArea.value = groupDataMap[name];
            document.querySelectorAll(".group-item").forEach(el => el.classList.remove("active"));
            item.classList.add("active");
            saveState();
        });
        groupList.appendChild(item);
    });

    // 高亮上次预览的分组
    if (currentPreviewName) {
        document.querySelectorAll(".group-item").forEach(item => {
            const val = item.querySelector(".group-check").value;
            if (val === currentPreviewName) item.classList.add("active");
        });
    }
}

// 全选/取消全选
checkAll.addEventListener("change", () => {
    const checks = document.querySelectorAll(".group-check");
    checks.forEach(cb => cb.checked = checkAll.checked);
    saveState();
});

// 批量下载选中的JSON
batchDownloadBtn.addEventListener("click", () => {
    const checked = document.querySelectorAll(".group-check:checked");
    if (checked.length === 0) {
        alert("请先勾选要下载的分组");
        return;
    }
    checked.forEach((cb, index) => {
        const fileName = cb.value;
        const text = groupDataMap[fileName];
        setTimeout(() => {
            const blob = new Blob([text], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
        }, index * 200);
    });
    log(`📥 批量下载已触发，共 ${checked.length} 个文件`);
});

// 复制当前预览的JSON至剪贴板
async function copyJson() {
    const text = previewArea.value.trim();
    if (!text) {
        alert("暂无预览内容，先生成分组");
        return;
    }
    await navigator.clipboard.writeText(text);
    log("✅ 当前预览分组的JSON已复制到剪贴板");
}

// 完全对齐Python脚本逻辑：按行分记录，逗号分列，统一列数，按行分组
function generateAllGroups() {
    groupDataMap = {};
    groupNameList = [];
    previewArea.value = "";

    const rawText = inputArea.value.trim();
    if (!rawText) {
        alert("未识别到有效参数，请检查粘贴内容");
        log("❌ 无可用参数");
        return;
    }

    let rawLines = rawText.split(/\r?\n/).map(line => line.trim()).filter(line => line);

    if (rawLines.length === 1) {
        const allFields = splitSingleLine(rawLines[0]);
        const COL_PER_ROW = 11;
        if (allFields.length > COL_PER_ROW) {
            const newRows = [];
            for (let i = 0; i < allFields.length; i += COL_PER_ROW) {
                newRows.push(allFields.slice(i, i + COL_PER_ROW));
            }
            log(`✅ 单行长文本自动拆行，共拆分出 ${newRows.length} 条参数`);
            processRowsAndOutput(newRows);
            return;
        }
    }

    const originRows = rawLines.map(line => splitSingleLine(line));
    log(`✅ 读取完成，有效参数共 ${originRows.length} 条`);
    originRows.forEach((row, idx) => {
        log(`第 ${idx + 1} 条，字段数量：${row.length}`);
    });

    processRowsAndOutput(originRows);
}

function processRowsAndOutput(originRows) {
    const maxColumn = Math.max(...originRows.map(row => row.length));
    const standardRows = originRows.map(row => {
        return [...row, ...new Array(maxColumn - row.length).fill("")];
    });
    log(`✅ 标准化完成，统一所有行列数：${maxColumn}`);

    const batchNum = parseInt(batchSizeInput.value.trim(), 10);
    if (isNaN(batchNum) || batchNum <= 0) {
        alert("单分组最大行数必须填写大于0的整数！");
        log("❌ 分组行数输入非法，终止处理");
        return;
    }
    log(`配置每组最大行数：${batchNum}`);

    const batchList = chunkArray(standardRows, batchNum);
    const totalGroup = batchList.length;
    log(`按每组 ${batchNum} 条拆分，共生成 ${totalGroup} 个分组`);

    batchList.forEach((batchData, idx) => {
        const fileFullName = `结果_${String(idx + 1).padStart(3, "0")}.json`;
        groupDataMap[fileFullName] = JSON.stringify(batchData, null, "");
        groupNameList.push(fileFullName);
    });

    renderGroupList();
    checkAll.checked = false;
    saveState();

    log("\n🎉 全部处理完成！可切换分组预览、复制或批量下载");
    alert(`处理完毕\n总参数条数：${originRows.length}\n生成分组数：${totalGroup}`);
}

// 实时输入自动保存
inputArea.addEventListener("input", saveState);
batchSizeInput.addEventListener("input", saveState);

// 按钮事件绑定
clearBtn.addEventListener("click", () => {
    inputArea.value = "";
    log("已清空参数输入框");
});
// 手动重置全部本地存储（相当于彻底关闭清空数据）
resetAllBtn.addEventListener("click", async () => {
    if(confirm("确定要清空所有保存的参数、分组、日志记录吗？此操作不可恢复！")){
        await clearAllSavedState();
        log("✅ 已重置全部本地记录");
    }
});
generateBtn.addEventListener("click", generateAllGroups);
copyBtn.addEventListener("click", copyJson);

// 页面加载时自动读取上次保存的所有数据（重点！）
window.addEventListener("DOMContentLoaded", async () => {
    await loadState();
});