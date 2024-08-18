const xmls = 'http://www.w3.org/2000/svg';
// 靠邊站 group 的人
const people1 = [];
// 都站滿 group 的人
const people2 = [];
// 靠邊站 gropu 站左側的人
const sequence1L = [];
// 靠邊站 gropu 站右側的人
const sequence1R = [];
// 都站滿 gropu 站左側的人
const sequence2L = [];
// 都站滿 gropu 站右側的人
const sequence2R = [];

const setting = {
    functionWidth: 118
};

const counter = {
    g1: {
        // 靠邊站 group 已疏散人數
        goal: 0,
        // 靠邊站 group 總人數
        total: 0,
        // 靠邊站 group 經過 frame 數
        frame: 0
    },
    g2: {
        // 都站滿 group 已疏散人數
        goal: 0,
        // 都站滿 group 總人數
        total: 0,
        // 都站滿 group 經過 frame 數
        frame: 0
    },
    frame: 0
};
const escalator = {
    checkPoint: {},
    handDrail: {},
    step: {}
};
const animation = {
    // true 時可播放動畫。false 停止播放
    playing: false,
    // true 為新案。false 為運作中
    newProject: true
};
var Walk;
var RenderSequence;
var ScrollEscalator;


class Person {
    constructor(status, speed, group, direction) {
        this.position = 0;
        this.crossPosition = 0;
        this.speed = speed;
        this.v = speed;
        this.status = status;
        this.group = group;
        this.direction = direction;
        this.serialNumber = 0;
        this.groupIndex = 0;
        this.inQueue = false,
        this.isWaiting = false;
    }
}

/**
 * 直立裝置的人物向前走
 * @param {Person} person 此人物物件
 */
function WalkPortrait(person){
    switch(person.status){
        case 'goal':
            break;
        case 'stand':
        case 'climb':
            // 階梯中站立或爬升的人，檢查是否位置已離開階梯
            if (person.position <= escalator.checkPoint.last){
                // 已到最尾端，使用自己本來的速率
                person.status = 'leave';
                person.inQueue = false;
                person.v = person.speed;
            }
            else{
                // 還在階梯中，穩定前進
                person.position += person.v;
            }
            break;
        case 'walk':
            // 準備進入、走動的人，檢查是否過於靠近前方，是的話速率等於前方的人來排隊
            QueuePortrait(person);
            const nextStepPosition = GetNextStepPosition(person);
            const sequence = GetSequence(person);
            // 如果有找到前方的階梯座標，檢查是不是已經被前方的人站走，若是的話停止不動，等待下一個階梯
            if (nextStepPosition > 0){
                // 最前方的人，不用檢查
                if (person.serialNumber !== 0 && parseInt(sequence[person.serialNumber - 1].position) === parseInt(nextStepPosition)){
                    person.status = 'waiting';
                    return;
                }
            }
            person.position += person.v;
            // 若此 frame 剛好前方階梯座標捲動跨過自己，則站上階梯
            if (nextStepPosition > 0 && person.position <= nextStepPosition){
                Stand(person, nextStepPosition);
            }
            break;
        case 'leave':
            // 離開的人，檢查是否過於靠近前方，是的話速率等於前方的人來排隊
            QueuePortrait(person);
            person.position += person.v;
            // 離開的人若位置已達疏散的位置，則設為已疏散的人
            if (person.position <= escalator.checkPoint.goal){
                Goal(person);
            }
            break;
        case 'waiting':
            // 等待上階梯的人，檢查是否過於靠近前方，是的話速率等於前方的人來排隊
            QueuePortrait(person);
            // 還沒走到進入點，先走。若走到了就停著不動
            if (person.position > escalator.checkPoint.position){
                person.position += person.v;
            }
            else{
                person.position = escalator.checkPoint.position;
                person.v = 0;
            }
            // 取得第一個階梯的位置，若階梯剛好是跨過人物（前一 frame 座標與現在座標剛好夾住人物位置），讓人物站上階梯
            const firstStepPosition = GetFirstStepPosition(person);
            if (firstStepPosition - escalator.speed > person.position && person.position >= firstStepPosition){
                Stand(person, firstStepPosition);
            }            
            break;
        case 'rush':
            // 準備進入、趕路的人，檢查是否過於靠近前方，是的話速率等於前方的人來排隊
            QueuePortrait(person);
            // 若位置已進入階梯範圍，速率設為爬升中的速率
            if (person.position >= escalator.checkPoint.position){
                person.status = 'climb';
                person.v = escalator.climbSpeed;
            }
            person.position += person.v;
            break;
    }
}

/**
 * 橫向裝置的人物向前走
 * @param {Person} person 此人物物件
 */
function WalkLandscape(person){
    switch(person.status){
        case 'goal':
            break;
        case 'stand':
        case 'climb':
            // 階梯中站立或爬升的人，檢查是否位置已離開階梯
            if (person.position >= escalator.checkPoint.last){
                // 已到最尾端，使用自己本來的速率
                person.status = 'leave';
                person.inQueue = false;
                person.v = person.speed;
            }
            else{
                // 還在階梯中，穩定前進
                person.position += person.v;
            }
            break;
        case 'walk':
            // 準備進入、走動的人，檢查是否過於靠近前方，是的話速率等於前方的人來排隊
            QueueLandscape(person);
            const nextStepPosition = GetNextStepPosition(person);
            const sequence = GetSequence(person);
            // 如果有找到前方的階梯座標，檢查是不是已經被前方的人站走，若是的話停止不動，等待下一個階梯
            if (nextStepPosition > 0){
                // 最前方的人，不用檢查
                if (person.serialNumber !== 0 && parseInt(sequence[person.serialNumber - 1].position) === parseInt(nextStepPosition)){
                    person.status = 'waiting';
                    return;
                }
            }
            person.position += person.v;
            // 若此 frame 剛好前方階梯座標捲動跨過自己，則站上階梯
            if (nextStepPosition > 0 && person.position >= nextStepPosition){
                Stand(person, nextStepPosition);
            }
            break;
        case 'leave':
            // 離開的人，檢查是否過於靠近前方，是的話速率等於前方的人來排隊
            QueueLandscape(person);
            person.position += person.v;
            // 離開的人若位置已達疏散的位置，則設為已疏散的人
            if (person.position >= escalator.checkPoint.goal){
                Goal(person);
            }
            break;
        case 'waiting':
            // 等待上階梯的人，檢查是否過於靠近前方，是的話速率等於前方的人來排隊
            QueueLandscape(person);
            // 還沒走到進入點，先走。若走到了就停著不動
            if (person.position < escalator.checkPoint.position){
                person.position += person.v;
            }
            else{
                person.position = escalator.checkPoint.position;
                person.v = 0;
            }
            // 取得第一個階梯的位置，若階梯剛好是跨過人物（前一 frame 座標與現在座標剛好夾住人物位置），讓人物站上階梯
            const firstStepPosition = GetFirstStepPosition(person);
            if (firstStepPosition - escalator.speed < person.position && person.position <= firstStepPosition){
                Stand(person, firstStepPosition);
            }
            break;
        case 'rush':
            // 準備進入、趕路的人，檢查是否過於靠近前方，是的話速率等於前方的人來排隊
            QueueLandscape(person);
            // 若位置已進入階梯範圍，速率設為爬升中的速率
            if (person.position >= escalator.checkPoint.position){
                person.status = 'climb';
                person.v = escalator.climbSpeed;
            }
            person.position += person.v;
            break;
    }
}

/**
 * 人物站上階梯
 * @param {Person} person 此人物物件
 * @param {number} newPosition 要站上的新 position
 */
function Stand(person, newPosition){
    person.position = newPosition;
    person.inQueue = false;
    person.v = escalator.speed;
    person.status = 'stand';
}

/**
 * 人物疏散成功
 * @param {Person} person 此人物物件
 */
function Goal(person){
    person.status = 'goal';
    // 不再於畫面上顯示
    document.getElementById(`p${person.group}_${person.groupIndex}`).style.display = 'none';
    // 依靠邊站還是都站滿，計算已疏散人數，若人數已滿則標上所花時間秒數
    if (person.group === 1){
        counter.g1.goal++;
        if (counter.g1.goal === counter.g1.total){
            FinishTimer(1);
        }
    }
    else{
        counter.g2.goal++;
        if (counter.g2.goal === counter.g2.total){
            FinishTimer(2);
        }
    }
    RenderCounter();
    // 都疏散完了則結束，並只剩重置按鈕可以按
    if (counter.g1.goal === counter.g1.total && counter.g2.goal === counter.g2.total){
        animation.playing = false;
        btnPause.setAttribute('disabled', true);
    }
}

/**
 * 直立裝置的人物是否太靠近前方，是的話進入排隊狀態，放慢速度
 * @param {Person} person 此人物物件
 */
function QueuePortrait(person){
    const sequence = GetSequence(person);
    // 序列最前方的人不檢查
    if (person.serialNumber === 0 || sequence[person.serialNumber - 1].status === 'goal') return;
    // 前方人的座標減去此人的座標，看此距離是否在範圍內（直立時 personBarrier 為負數）
    if ((sequence[person.serialNumber - 1].position - sequence[person.serialNumber].position) >= setting.personBarrier){
        // 太接近了進入排隊狀態，速度同前方人物
        person.inQueue = true;
        person.v = GetFrontPersonSpeed(person);
    }
    else{
        // 前方為空，使用自己速率
        person.inQueue = false;
        person.v = person.speed;
    }
}

/**
 * 橫向裝置的人物是否太靠近前方，是的話進入排隊狀態，放慢速度
 * @param {Person} person 此人物物件
 */
function QueueLandscape(person){
    const sequence = GetSequence(person);
    if (person.serialNumber === 0 || sequence[person.serialNumber - 1].status === 'goal') return;
    // 前方人的座標減去此人的座標，看此距離是否在範圍內
    if ((sequence[person.serialNumber - 1].position - sequence[person.serialNumber].position) <= setting.personBarrier){
        // 太接近了進入排隊狀態，速度同前方人物
        person.inQueue = true;
        person.v = GetFrontPersonSpeed(person);
    }
    else{
        // 前方為空，使用自己速率
        person.inQueue = false;
        person.v = person.speed;
    }
}

const btnPlay = document.getElementById('btnPlay');
const btnPause = document.getElementById('btnPause');
const btnReset = document.getElementById('btnReset');
const svgWalk = document.getElementById('svgWalk');
const svgRush = document.getElementById('svgRush');
const iptRush = document.getElementById('iptRush');
const iptWalk = document.getElementById('iptWalk');
const rectBar1 = document.getElementById('rectBar1');
const txtCounter1 = document.getElementById('txtCounter1');
const rectBar2 = document.getElementById('rectBar2');
const txtCounter2 = document.getElementById('txtCounter2');
const spnTimer = document.getElementById('spnTimer');

window.addEventListener('load', BodyInit);

/**
 * DOM 物件完成讀取後的事件
 */
function BodyInit(){
    btnPlay.addEventListener('click', BtnPlayClick);
    btnPause.setAttribute('disabled', true);
    btnPause.addEventListener('click', BtnPauseClick);
    btnReset.setAttribute('disabled', true);
    btnReset.addEventListener('click', BtnResetClick);
    screen.orientation.addEventListener('change', ScreenOrientationChange);
    InitSetting();
    InitSvg();
}

/**
 * 裝置旋轉的事件
 */
function ScreenOrientationChange(){
    // 等同按下重置按鈕
    BtnResetClick();
    // 更新設定
    InitSetting();
    // 以新的螢幕長寬來重繪階梯、扶手地板
    InitSvg();
}

/**
 * 播放動畫
 */
function Play(){
    if (animation.playing){
        // 更新階梯的捲動
        ScrollEscalator(1);
        ScrollEscalator(2);

        // 更新人的前進
        PersonWalkAndRender();

        // 更新計數結果

        UpdateTimer();

        // 做完這個 frame 在指定時間後再做一次
        window.setTimeout(() => {
            Play();
        }, setting.milliSecondPerFrame);
    }
}

/**
 * 人往前走，並更新畫面
 */
function PersonWalkAndRender(){
    SequenceWalk(1, 'L');
    SequenceWalk(1, 'R');
    SequenceWalk(2, 'L');
    SequenceWalk(2, 'R');
}

/**
 * 序列的人往前走，並重繪圖形
 * @param {number} group 分組的編號，靠邊站 1，都站滿 2
 * @param {string} direction 方向 L 或 R
 */
function SequenceWalk(group, direction){
    let sequence;
    if (group === 1){
        if (direction === 'L'){
            sequence = sequence1L;
        }
        else if (direction === 'R'){
            sequence = sequence1R;
        }
    }
    else if (group === 2){
        if (direction === 'L'){
            sequence = sequence2L;
        }
        else if (direction === 'R'){
            sequence = sequence2R;
        }
    }
    for (let i = 0, n = sequence.length; i < n; i++){
        const person = sequence[i];
        Walk(person);
        RenderSequence(person);
    }
}

/**
 * 橫向裝置的單人向前走
 * @param {Person} person 要向前走的人物物件
 */
function RenderSequenceLandscape(person){
    const circle = document.getElementById(`p${person.group}_${person.groupIndex}`);
    circle.setAttribute('cx', person.position);
}

/**
 * 直立裝置的單人向前走
 * @param {Person} person 要向前走的人物物件
 */
function RenderSequencePortrait(person){
    const circle = document.getElementById(`p${person.group}_${person.groupIndex}`);
    circle.setAttribute('cy', person.position);
}

/**
 * 設定更新
 */
function InitSetting(){
    // 是否為直立移動裝置
    setting.isPortrait = screen.orientation.type.indexOf('portrait') > -1;
    // FPS 每秒格數
    setting.framePerSecond = 60;
    // 每格多少毫秒
    setting.milliSecondPerFrame = 1000 / setting.framePerSecond;
    // 階梯數量
    escalator.step.count = 16;
    // 直立裝置
    if (setting.isPortrait){
        // 繪製區域的寬度(直立時意義相反)
        setting.svgShowWidth = (screen.availHeight ? screen.availHeight : window.innerHeight) - setting.functionWidth;
        // 繪製區域的高度(直立時意義相反)
        setting.svgShowHeight = screen.availWidth ? screen.availWidth : window.innerWidth;
        // 長度縮放比例
        setting.scale = Math.min(60 + (setting.svgShowWidth - 700) / 10, setting.svgShowHeight / 3);
        // 人物的中心距離，直立時公式使用負數在 Person.IsApproach 裡就不用考慮絕對值了
        setting.personBarrier = - 0.19 * setting.scale * 2;
        // 速率校正用
        setting.velocityAdjust = - 1;
        // 階梯寬度
        escalator.step.width = 0.4 * setting.scale;
        // 階梯高度
        escalator.step.height = 1 * setting.scale;
        // 扶手高度
        escalator.handDrail.height = escalator.step.height / 8;
        // 扶手寬度
        escalator.handDrail.width = escalator.step.width * (escalator.step.count + 1);
        // 扶手厚度
        escalator.handDrail.depth = escalator.handDrail.height * 0.5;
        // 階梯的速度，直立時為由下往上走，y 座標遞減故為負數
        escalator.speed = - 0.6 * setting.scale / setting.framePerSecond,
        // 人在階梯中走動的速度，直立時為由下往上走，y 座標遞減故為負數
        escalator.climbSpeed = - 1 * setting.scale / setting.framePerSecond,
        // 階梯進入點位置
        escalator.checkPoint.position = setting.svgShowWidth - (setting.svgShowWidth - escalator.step.width * (escalator.step.count - 1)) * 2 / 3;
        // 階梯進入點的邊距
        escalator.checkPoint.margin = (setting.svgShowHeight - escalator.step.height * 2 - escalator.handDrail.height * 4) / 3;
        // 階梯離開點位置
        escalator.checkPoint.last = escalator.checkPoint.position - escalator.step.width * (escalator.step.count - 1);
        // 人物的生成起始點位置
        escalator.checkPoint.start = (setting.svgShowWidth + escalator.checkPoint.position) / 2,
        // 人物的消失結束點位置
        escalator.checkPoint.goal = - (setting.svgShowWidth - escalator.checkPoint.position) / 2;
        RenderSequence = RenderSequencePortrait;
        ScrollEscalator = ScrollEscalatorPortrait;
        Walk = WalkPortrait;
        svgRush.setAttribute('width', setting.svgShowHeight / 2);
        svgRush.setAttribute('height', setting.svgShowWidth);
        svgWalk.setAttribute('width', setting.svgShowHeight / 2);
        svgWalk.setAttribute('height', setting.svgShowWidth);
    }
    // 橫向裝置
    else{
        // 繪製區域的寬度
        setting.svgShowWidth = (screen.availWidth ? screen.availWidth : window.innerWidth) - setting.functionWidth;
        // 繪製區域的高度
        setting.svgShowHeight = (screen.availHeight ? screen.availHeight : window.innerHeight) * 2 / 3;
        // 長度縮放比例
        setting.scale = Math.min(60 + (setting.svgShowWidth - 700) / 10, setting.svgShowHeight / 3);
        // 人物的中心距離
        setting.personBarrier = 0.19 * setting.scale * 2;
        // 速率校正用
        setting.velocityAdjust = 1;
        // 階梯寬度
        escalator.step.width = 0.4 * setting.scale;
        // 階梯高度
        escalator.step.height = 1 * setting.scale;
        // 扶手高度
        escalator.handDrail.height = escalator.step.height / 8;
        // 扶手寬度
        escalator.handDrail.width = escalator.step.width * (escalator.step.count + 1);
        // 階梯的速度，橫向時為由左往右走，x 座標遞增故為正數
        escalator.speed = 0.6 * setting.scale / setting.framePerSecond,
        // 人在階梯中走動的速度，橫向時為由左往右走，x 座標遞增故為正數
        escalator.climbSpeed = 1 * setting.scale / setting.framePerSecond,
        // 階梯進入點位置
        escalator.checkPoint.position = (setting.svgShowWidth - escalator.step.width * (escalator.step.count - 1)) / 2;
        // 階梯進入點的邊距
        escalator.checkPoint.margin = (setting.svgShowHeight - escalator.step.height * 2 - escalator.handDrail.height * 4) / 3;
        // 階梯離開點位置
        escalator.checkPoint.last = escalator.checkPoint.position + escalator.step.width * (escalator.step.count - 1);
        // 人物的生成起始點位置
        escalator.checkPoint.start = escalator.checkPoint.position / 2,
        // 人物的消失結束點位置
        escalator.checkPoint.goal = setting.svgShowWidth + escalator.checkPoint.position / 2;
        RenderSequence = RenderSequenceLandscape;
        ScrollEscalator = ScrollEscalatorLandscape;
        Walk = WalkLandscape;
        svgRush.setAttribute('width', setting.svgShowWidth);
        svgRush.setAttribute('height', setting.svgShowHeight / 2 - 5);
        svgWalk.setAttribute('width', setting.svgShowWidth);
        svgWalk.setAttribute('height', setting.svgShowHeight / 2 - 5);
    }

    // 人物的半徑
    setting.personRadius = 0.16 * setting.scale;
    // 與前進垂直方向的間隙（包括「人與人」和「人與扶手」）
    escalator.step.gap = (escalator.step.height - setting.personRadius * 4) / 3;
    // 階梯內黃線框的寬度
    escalator.step.border = 0.03 * setting.scale;
}

/**
 * 初始化繪圖區，反覆使用的階梯、扶手和地板
 */
function InitSvg(){
    RemoveSvg(1);
    AppendStep(1);
    AppendHandDrailAndFloor(1);
    RemoveSvg(2);
    AppendStep(2);
    AppendHandDrailAndFloor(2);
}

/**
 * 初始化階梯物件
 * @param {number} group 分組的編號，靠邊站 1，都站滿 2
 */
function AppendStep(group){
    const docFrag = document.createDocumentFragment();
    const margin = group === 1 ? escalator.checkPoint.margin : escalator.checkPoint.margin / 2;
    if (setting.isPortrait){
        for (let i = -1; i < escalator.step.count; i++){
            // 階梯黑色外層
            AppendStepOne(docFrag, margin + escalator.handDrail.height, escalator.checkPoint.position - escalator.step.width * (i + 1),
                escalator.step.height, escalator.step.width, '#636363', i, group, escalator.checkPoint.position - (i + 0.5) * escalator.step.width);
            // 階梯黃色框線
            AppendStepOne(docFrag, margin  + escalator.handDrail.height + escalator.step.border, escalator.checkPoint.position + escalator.step.border - escalator.step.width * (i + 1),
                escalator.step.height - escalator.step.border * 2, escalator.step.width - escalator.step.border * 2, '#dfd478');
            // 階梯黑色內層
            AppendStepOne(docFrag, margin  + escalator.handDrail.height + escalator.step.border * 2, escalator.checkPoint.position + escalator.step.border * 2 - escalator.step.width * (i + 1),
                escalator.step.height - escalator.step.border * 4, escalator.step.width - escalator.step.border * 4, '#636363');
        }
    }
    else{
        for (let i = -1; i < escalator.step.count; i++){
            // 階梯黑色外層
            AppendStepOne(docFrag, escalator.step.width * i + escalator.checkPoint.position, margin + escalator.handDrail.height,
                escalator.step.width, escalator.step.height, '#636363', i, group, escalator.checkPoint.position + (i + 0.5) * escalator.step.width);
            // 階梯黃色框線
            AppendStepOne(docFrag, escalator.step.width * i + escalator.checkPoint.position + escalator.step.border, margin  + escalator.handDrail.height + escalator.step.border,
                escalator.step.width - escalator.step.border * 2, escalator.step.height - escalator.step.border * 2, '#dfd478');
            // 階梯黑色內層
            AppendStepOne(docFrag, escalator.step.width * i + escalator.checkPoint.position + escalator.step.border * 2, margin  + escalator.handDrail.height + escalator.step.border * 2,
                escalator.step.width - escalator.step.border * 4, escalator.step.height - escalator.step.border * 4, '#636363');
        }
    }    
    document.getElementById(`g${group}_escalator`).appendChild(docFrag);
}

/**
 * 繪製一個階梯
 * @param {DocumentFragment} docFrag 暫存 DOM 物件
 * @param {number} x 座標 x
 * @param {number} y 座標 y
 * @param {number} width 矩形寬度
 * @param {number} height 矩形高度
 * @param {string} color 填滿顏色
 * @param {number} i 編號 -1 ~ setting.step.count
 * @param {number} group 分組的編號，靠邊站 1，都站滿 2
 * @param {number} pos 階梯中心 position 座標
 */
function AppendStepOne(docFrag, x, y, width, height, color, i, group, pos){
    const step = document.createElementNS(xmls, 'rect');
    step.setAttribute('x', x);
    step.setAttribute('y', y);
    step.setAttribute('width', width);
    step.setAttribute('height', height);
    step.setAttribute('fill', color);
    if (group && pos){
        step.setAttribute('id', `step_g${group}_` + i);
        step.setAttribute('data-pos', pos);
    }
    docFrag.appendChild(step);
}

/**
 * 初始化扶手和地板
 * @param {number} group 分組的編號，靠邊站 1，都站滿 2
 */
function AppendHandDrailAndFloor(group){
    const docFrag = document.createDocumentFragment();
    const margin = group === 1 ? escalator.checkPoint.margin : escalator.checkPoint.margin / 2;
    if (setting.isPortrait){
        // 左側扶手
        AppendHandDrail(docFrag, margin, escalator.checkPoint.position - escalator.step.width * escalator.step.count,
            escalator.handDrail.height, escalator.handDrail.width, escalator.handDrail.height * 0.5);
        // 右側扶手
        AppendHandDrail(docFrag, margin + escalator.handDrail.height + escalator.step.height, escalator.checkPoint.position - escalator.step.width * escalator.step.count,
            escalator.handDrail.height, escalator.handDrail.width, escalator.handDrail.height * 0.5);
        // 進入前的地板
        AppendFloor(docFrag, margin + escalator.handDrail.height - 0.5, escalator.checkPoint.position, escalator.step.height + 1, escalator.step.width * 2);
        // 離開後的地板
        AppendFloor(docFrag, margin + escalator.handDrail.height - 0.5, escalator.checkPoint.last - escalator.step.width * 2, escalator.step.height + 1, escalator.step.width * 2);
    }
    else{
        // 左側扶手
        AppendHandDrail(docFrag, escalator.checkPoint.position - escalator.step.width, margin,
            escalator.handDrail.width, escalator.handDrail.height, escalator.handDrail.height * 0.5);
        // 右側扶手
        AppendHandDrail(docFrag, escalator.checkPoint.position - escalator.step.width, margin + escalator.handDrail.height + escalator.step.height,
            escalator.handDrail.width, escalator.handDrail.height, escalator.handDrail.height * 0.5);
        // 進入前的地板
        AppendFloor(docFrag, escalator.checkPoint.position - escalator.step.width * 2, margin + escalator.handDrail.height - 0.5, escalator.step.width * 2, escalator.step.height + 1);
        // 離開後的地板
        AppendFloor(docFrag, escalator.checkPoint.last, margin + escalator.handDrail.height - 0.5, escalator.step.width * 2, escalator.step.height + 1);
    }
    document.getElementById(`g${group}_cover`).appendChild(docFrag);
}

/**
 * 初始化繪製扶手
 * @param {DocumentFragment} docFrag 暫存 DOM 物件
 * @param {number} x 扶手左上角的座標 x
 * @param {number} y 扶手左上角的座標 y
 * @param {number} width 扶手的寬度
 * @param {number} height 扶手的高度
 * @param {number} radius 扶手的圓角半徑
 */
function AppendHandDrail(docFrag, x, y, width, height, radius){
    const cover = document.createElementNS(xmls, 'rect');
    cover.setAttribute('x', x);
    cover.setAttribute('y', y);
    cover.setAttribute('width', width);
    cover.setAttribute('height', height);
    cover.setAttribute('fill', '#636363');
    cover.setAttribute('rx', radius);
    cover.setAttribute('ry', radius);
    docFrag.appendChild(cover);
}

/**
 * 初始化繪製地板
 * @param {DocumentFragment} docFrag 暫存 DOM 物件
 * @param {number} x 扶手左上角的座標 x
 * @param {number} y 扶手左上角的座標 y
 * @param {number} width 扶手的寬度
 * @param {number} height 扶手的高度
 */
function AppendFloor(docFrag, x, y, width, height){
    const cover = document.createElementNS(xmls, 'rect');
    cover.setAttribute('x', x);
    cover.setAttribute('y', y);
    cover.setAttribute('width', width);
    cover.setAttribute('height', height);
    cover.setAttribute('fill', '#fcfaf2');
    docFrag.appendChild(cover);
}

/**
 * 橫向裝置的階梯捲動動畫
 * @param {number} group 分組的編號，靠邊站 1，都站滿 2
 */
function ScrollEscalatorLandscape(group){
    const firstStepPosition = parseFloat(document.getElementById(`g${group}_escalator`).children[0].getAttribute('x')) + escalator.speed;
    const offset = firstStepPosition > escalator.checkPoint.position ? escalator.speed - escalator.step.width : escalator.speed;
    const rectangles = document.getElementById(`g${group}_escalator`).children;
    for (let i = 0, n = rectangles.length; i < n; i++){
        rectangles[i].setAttribute('x', parseFloat(rectangles[i].getAttribute('x')) + offset);
        if (rectangles[i].hasAttribute('data-pos')){
            rectangles[i].setAttribute('data-pos', parseFloat(rectangles[i].getAttribute('data-pos')) + offset);
        }
    }
}

/**
 * 直立裝置的階梯捲動動畫
 * @param {number} group 分組的編號，靠邊站 1，都站滿 2
 */
function ScrollEscalatorPortrait(group){
    const firstStepPosition = parseFloat(document.getElementById(`g${group}_escalator`).children[0].getAttribute('y')) + escalator.speed;
    const offset = firstStepPosition < escalator.checkPoint.position - escalator.step.width ? escalator.speed + escalator.step.width : escalator.speed;
    const rectangles = document.getElementById(`g${group}_escalator`).children;
    for (let i = 0, n = rectangles.length; i < n; i++){
        rectangles[i].setAttribute('y', parseFloat(rectangles[i].getAttribute('y')) + offset);
        if (rectangles[i].hasAttribute('data-pos')){
            rectangles[i].setAttribute('data-pos', parseFloat(rectangles[i].getAttribute('data-pos')) + offset);
        }
    }
}

/**
 * 清空繪圖區裡的人
 * @param {number} group 分組的編號，靠邊站 1，都站滿 2
 */
function ClearSvg(group){
    const people = document.getElementById(`g${group}_people`).children;
    while(people.length > 0){
        people[0].remove();
    }
}

/**
 * 清空階梯和地板，重繪前動作
 * @param {number} group 分組的編號，靠邊站 1，都站滿 2
 */
function RemoveSvg(group){
    const gEscalator = document.getElementById(`g${group}_escalator`).children;
    while(gEscalator.length > 0){
        gEscalator[0].remove();
    }
    const gCover = document.getElementById(`g${group}_cover`).children;
    while(gCover.length > 0){
        gCover[0].remove();
    }
}

/**
 * 產生人物的資料到 people1 和 people2 陣列中
 * @param {number} rushCount 趕路的人的數量
 * @param {number} walkCount 走路的人的數量
 */
function ProducePerson(rushCount, walkCount){
    const totalCount = rushCount + walkCount;
    // 與前進方向垂直的方向之位置，分為站左側 crossPosL 和右側 crossPosR
    const crossPosL = escalator.checkPoint.margin + escalator.handDrail.height + escalator.step.gap + setting.personRadius;
    const crossPosR = crossPosL + escalator.step.gap + setting.personRadius * 2;
    // 清空舊的陣列資料
    people1.length = 0;
    people2.length = 0;
    sequence1L.length = 0;
    sequence1R.length = 0;
    sequence2L.length = 0;
    sequence2R.length = 0;
    // 亂數產生各人數的權重，做為速度的分配依據
    const rushBuffer = new Uint16Array(rushCount);
    window.crypto.getRandomValues(rushBuffer);
    const walkBuffer = new Uint16Array(walkCount);
    window.crypto.getRandomValues(walkBuffer);
    // 1.66 ~ 1.94 趕路速度(m/s)
    for(let i = 0; i < rushCount; i++){
        const offset = rushBuffer[i] / 65536;
        const speed = (1.66 + 0.28 * offset) * setting.scale / setting.framePerSecond * setting.velocityAdjust;
        people1.push(new Person('rush', speed, 1, 'L'));
        people2.push(new Person('rush', speed, 2, ''));
    }
    // 0.88~1.50 普通行走速度(m/s)
    for(let i = 0; i < walkCount; i++){
        const offset = walkBuffer[i] / 65536;
        const speed = (0.88 + 0.62 * offset) * setting.scale / setting.framePerSecond * setting.velocityAdjust;
        people1.push(new Person('walk', speed, 1, 'R'));
        people2.push(new Person('walk', speed, 2, ''));
    }
    
    // 靠邊站 group 1 的人依 Rush 趕路的靠左，Walk 走路的人靠右
    let indexL = 0, indexR = 0;
    for (let i = 0; i < totalCount; i++){
        people1[i].groupIndex = i;
        if (people1[i].direction === 'L'){
            people1[i].serialNumber = indexL;
            people1[i].position = escalator.checkPoint.start - setting.personBarrier * indexL * 1.5;
            people1[i].crossPosition = crossPosL;
            sequence1L.push(people1[i]);
            indexL++;
        }
        else if(people1[i].direction === 'R'){
            people1[i].serialNumber = indexR;
            people1[i].position = escalator.checkPoint.start - setting.personBarrier * indexR * 1.5;
            people1[i].crossPosition = crossPosR;
            sequence1R.push(people1[i]);
            indexR++;
        }
    }

    // 都站滿 group 2 的人要亂數排列，避免 Rush 趕路的人集中在前方，看起來很奇怪
    indexL = 0;
    indexR = 0;
    const indexArray = [];
    for(let i = 0; i < totalCount; i++){
        indexArray.push(i);
    }
    for (let i = 0; i < totalCount; i++){
        const idx = Math.floor(Math.random() * indexArray.length);
        const r = indexArray[idx];
        indexArray.splice(idx, 1);
        people2[r].groupIndex = r;
        // 亂數取到奇數靠左，取到偶數靠右
        if (r & 1){
            people2[r].direction = 'L';
            people2[r].serialNumber = indexL;
            people2[r].position = escalator.checkPoint.start - setting.personBarrier * indexL * 1.5;
            people2[r].crossPosition = crossPosL - escalator.checkPoint.margin / 2;
            sequence2L.push(people2[r]);
            indexL++;
        }
        else{
            people2[r].direction = 'R';
            people2[r].serialNumber = indexR;
            people2[r].position = escalator.checkPoint.start - setting.personBarrier * indexR * 1.5;
            people2[r].crossPosition = crossPosR - escalator.checkPoint.margin / 2;
            sequence2R.push(people2[r]);
            indexR++;
        }
    }
}

/**
 * 初始化人到繪圖區
 * @param {number} group 分組的編號，靠邊站 1，都站滿 2
 */
function RenderPerson(group){
    const docFrag = document.createDocumentFragment();
    const people = (group === 1) ? people1 : people2;
    for(let i = 0, n = people.length; i < n; i++){
        const circle = document.createElementNS(xmls, 'circle');
        circle.setAttribute('id', `p${group}_${i}`);
        if (setting.isPortrait){
            circle.setAttribute('cx', people[i].crossPosition);
            circle.setAttribute('cy', people[i].position);
        }
        else{
            circle.setAttribute('cx', people[i].position);
            circle.setAttribute('cy', people[i].crossPosition);
        }
        circle.setAttribute('r', setting.personRadius);
        if (people[i].status === 'rush'){
            circle.setAttribute('fill', '#d9a8e3');
            if (group === 2) people[i].status = 'walk';
        }
        else{
            circle.setAttribute('fill', '#ffdb72');
        }
        docFrag.appendChild(circle);
    }
    document.getElementById(`g${group}_people`).appendChild(docFrag);
}

/**
 * 開始或繼續按鈕的點擊事件
 */
function BtnPlayClick(){
    // 若是一開始或剛按過重置，則要新建
    if (animation.newProject){
        // 檢查兩個人數輸入框的內容
        const rushValue = iptRush.value;
        const walkValue = iptWalk.value;
        if (rushValue === '' || isNaN(rushValue)){
            iptRush.focus();
            return;
        }
        if (walkValue === '' || isNaN(walkValue)){
            iptWalk.focus();
            return;
        }
        const intRush = parseInt(rushValue);
        const intWalk = parseInt(walkValue);
        if (intRush < 0 || intWalk < 0){
            return;
        }
        // 數值可以使用，設為已啟動的專案
        animation.newProject = false;
        ProducePerson(intRush, intWalk);
        RenderPerson(1);
        RenderPerson(2);
        ResetCounter(0, intRush + intWalk, 0, intRush + intWalk);

        // 鎖開始按鈕並更改文字，解暫停按鈕，解重置按鈕
        btnPlay.querySelector('span').textContent = 'Continue';
        iptRush.setAttribute('disabled', true);
        iptWalk.setAttribute('disabled', true);
    }
    btnPlay.setAttribute('disabled', true);
    btnPause.removeAttribute('disabled');
    btnReset.removeAttribute('disabled');
    animation.playing = true;
    Play();
}

/**
 * 暫停按鈕的點擊事件
 */
function BtnPauseClick(){
    animation.playing = false;
    btnPlay.removeAttribute('disabled');
    btnPause.setAttribute('disabled', true);
}

/**
 * 重置按鈕的點擊事件
 */
function BtnResetClick(){
    btnPlay.querySelector('span').textContent = 'Go';
    animation.newProject = true;
    animation.playing = false;
    btnPause.setAttribute('disabled', true);
    btnPlay.removeAttribute('disabled');
    btnReset.setAttribute('disabled', true);
    iptRush.removeAttribute('disabled');
    iptWalk.removeAttribute('disabled');
    // 清空人物的舊資料繪圖
    ClearSvg(1);
    ClearSvg(2);
    counter.frame = 0;
    spnTimer.textContent = '0.00';
    ResetCounter(0, 0, 0, 0);
    ResetTimer();
}

/**
 * 取得前方階梯中央的 x 座標
 * @param {Person} person 基準的人物物件
 */
function GetNextStepPosition(person){
    const steps = document.getElementById(`g${person.group}_escalator`).querySelectorAll('rect[id^="step_g"]');
    // 橫向時由左到右的階梯中，第一個大於此人位置的座標，或直立時由下到上第一個小於此人位置的座標
    for(const step of steps){
        const stepPosition = parseFloat(step.getAttribute('data-pos'));
        if ((!setting.isPortrait && stepPosition >= person.position) || (setting.isPortrait && stepPosition <= person.position)){
            return stepPosition;
        }
    }
}

/**
 * 取得前方人的速度
 * @param {Person} person 變更的人物物件
 * @returns {number} 前方人的目前速度
 */
function GetFrontPersonSpeed(person){
    const sequence = GetSequence(person);
    return sequence[person.serialNumber - 1].v;
}

/**
 * 取得指定分組與站位的序列
 * @param Person 此人物物件
 * @returns {Person[]} 對應的序列
 */
function GetSequence(person){
    if (person.group === 1){
        if (person.direction === 'L'){
            return sequence1L;
        }
        else if (person.direction === 'R'){
            return sequence1R;
        }
    }
    else if(person.group === 2){
        if (person.direction === 'L'){
            return sequence2L;
        }
        else if (person.direction === 'R'){
            return sequence2R;
        }
    }
}

/**
 * 取得序列中前方人物的位置
 * @param {Person} person 此人物物件
 * @returns {number} 前方人物的 position
 */
function GetFrontPersonPosition(person){
    const sequence = GetSequence(person);
    return sequence[person.serialNumber - 1].position;
}

/**
 * 取得人物前方第一個階梯位置
 * @param {Person} person 此人物物件
 * @returns {number} 階梯 data-pos
 */
function GetFirstStepPosition(person){
    const firstStep = document.getElementById(`step_g${person.group}_-1`);
    return parseFloat(firstStep.getAttribute('data-pos'));
}

/**
 * 更新計數器
 * @param {number} g1goal 靠邊站的 group 1 的已疏散人數
 * @param {number} g1total 靠邊站的 group 1 的總人數
 * @param {number} g2goal 都站滿的 group 2 的已疏散人數
 * @param {number} g2total 都站滿的 group 2 的總人數
 */
function ResetCounter(g1goal, g1total, g2goal, g2total){
    counter.g1.goal = g1goal;
    counter.g1.total = g1total;
    counter.g2.goal = g2goal;
    counter.g2.total = g2total;
    RenderCounter();
}

/**
 * 更新已疏散計數器的畫面
 */
function RenderCounter(){
    txtCounter1.textContent = counter.g1.goal + '/' + counter.g1.total;
    txtCounter2.textContent = counter.g2.goal + '/' + counter.g2.total;
    // 人數為 0 時清空並結束
    if (counter.g1.total === 0){
        rectBar1.setAttribute('width', '0');
        rectBar1.setAttribute('x', '110');
        rectBar2.setAttribute('width', '0');
        rectBar2.setAttribute('x', '110');
        return;
    }
    let width;
    // bar條的更新
    width = 110 * counter.g1.goal / counter.g1.total;
    rectBar1.setAttribute('width', width);
    rectBar1.setAttribute('x', 110 - width);
    width = 110 * counter.g2.goal / counter.g2.total;
    rectBar2.setAttribute('width', width);
    rectBar2.setAttribute('x', 110 - width);
}

/**
 * 更新碼表秒數的文字
 */
function UpdateTimer(){
    counter.frame++;
    const frame = Math.round(counter.frame * setting.milliSecondPerFrame / 10).toString();
    const length = frame.length;
    spnTimer.textContent = frame.substring(0, length - 2) + '.' + frame.substring(length - 2);
}

/**
 * 清空 bar 條中的秒數文字
 */
function ResetTimer(){
    txtTimer1.textContent = '';
    txtTimer2.textContent = '';
}

/**
 * 疏散完時顯示指定 group 上的完成秒數文字
 * @param {number} group 分組的編號，靠邊站 1，都站滿 2
 */
function FinishTimer(group){
    document.getElementById(`txtTimer${group}`).textContent = spnTimer.textContent;
}