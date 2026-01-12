import { PatientState, PatientGroup, Gender, DecisionResult } from '../types';

export const evaluateScreening = (data: PatientState): DecisionResult => {
  if (data.hb === '' || !data.gender) {
    return { status: 'continue', title: '數據輸入', message: '請輸入患者數據。' };
  }

  // 1. Diagnose Anemia
  const isAnemic =
    (data.gender === Gender.Male && data.hb < 13) ||
    (data.gender === Gender.Female && data.hb < 12);

  if (!isAnemic) {
    return {
      status: 'stop',
      title: '未檢測到貧血',
      message: '患者未達到 KDIGO 貧血診斷標準。',
      details: [
        `男性閾值: < 13 g/dL`,
        `女性閾值: < 12 g/dL`,
        `患者血紅素 (Hb): ${data.hb} g/dL`
      ],
      recommendationType: 'treatment' // Green for "No Anemia" (Healthy)
    };
  }

  return {
    status: 'continue',
    title: '診斷為貧血',
    message: '血紅素水平顯示貧血。請進行鐵治療評估。',
    details: [
      `患者血紅素 (Hb): ${data.hb} g/dL`
    ],
    recommendationType: 'urgent' // Red for "Anemia Detected"
  };
};

export const evaluateIronTherapy = (data: PatientState): DecisionResult => {
  if (data.ferritin === '' || data.tsat === '' || !data.group) return { status: 'continue', title: '', message: '' };

  // 1. Severe Iron Deficiency Check (Moved from Screening)
  if (data.ferritin < 45) {
    return {
      status: 'stop',
      title: '檢測到嚴重缺鐵',
      message: '鐵蛋白 (Ferritin) < 45 ng/ml。懷疑出血。',
      details: [
        '泌尿科轉診：評估血尿',
        '婦科轉診：評估月經失血',
        '腸胃科轉診：評估隱性腸胃出血'
      ],
      recommendationType: 'urgent'
    };
  }

  // 2. Check Stop Criteria (Active Infection)
  if (data.hasActiveInfection) {
    return {
      status: 'stop',
      title: '暫停鐵劑治療',
      message: '活動性感染期間應暫停鐵劑治療。',
      recommendationType: 'urgent'
    };
  }

  // 3. Check Overload
  if (data.ferritin > 700 || data.tsat >= 40) {
    return {
      status: 'continue', // Proceed to ESA evaluation if iron is high but still anemic
      title: '鐵存量充足 / 過高',
      message: '鐵參數高於鐵劑治療上限。',
      details: [
        '切勿開始鐵劑治療。',
        '如果目前正在使用鐵劑，請暫停治療。',
        '繼續調查其他原因（第 3 階段）。'
      ],
      recommendationType: 'info'
    };
  }

  // 4. Start Criteria based on Group
  let startIron = false;
  let route = '';
  let rationale = '';

  if (data.group === PatientGroup.HD) {
    // HD Group
    if (data.ferritin <= 500 && data.tsat <= 30) {
      startIron = true;
      route = '靜脈注射 (IV) 鐵劑';
      rationale = '血液透析患者的標準治療。';
    }
  } else {
    // Non-HD Groups (PD, ND-CKD)
    if (
      (data.ferritin < 100 && data.tsat < 40) ||
      (data.ferritin >= 100 && data.ferritin <= 300 && data.tsat < 25)
    ) {
      startIron = true;
      route = '口服或靜脈注射鐵劑';
      rationale = '基於患者數值和偏好。若口服無效或無法耐受，則改為靜脈注射。';
    }
  }

  if (startIron) {
    return {
      status: 'action_required', // Means we found a treatment, but user might want to continue to see ESA options? Usually Iron is first.
      title: '開始鐵劑治療',
      message: `建議給藥途徑：${route}`,
      details: [
        rationale,
        `每 ${data.group === PatientGroup.HD ? '月' : '3 個月'} 監測一次 Hb、Ferritin 和 TSAT。`,
        '若 Ferritin > 700 ng/ml 或 TSAT ≥ 40%，應暫停鐵劑治療'
      ],
      recommendationType: 'treatment'
    };
  }

  return {
    status: 'continue',
    title: '鐵量充足',
    message: '未達到啟動鐵劑標準。請進行完整貧血檢查。',
    recommendationType: 'info'
  };
};

export const evaluateWorkup = (data: PatientState): DecisionResult => {
  // Check if any option is selected
  const hasSelection =
    data.workupAllNegative ||
    data.workupSmear ||
    data.workupHemolysis ||
    data.workupInflammation ||
    data.workupB12Folate ||
    data.workupLiver ||
    data.workupThyroid ||
    data.workupParathyroid ||
    data.workupMyeloma ||
    data.workupParasites;

  if (!hasSelection) {
    return {
      status: 'action_required',
      title: '執行完整貧血篩檢',
      message: '在診斷腎性貧血之前，必須排除其他原因。請執行以下測試並註明結果。',
      recommendationType: 'info'
    };
  }

  // If "All Negative" is selected
  if (data.workupAllNegative) {
    return {
      status: 'continue', // Proceed to ESA
      title: '診斷：腎性貧血',
      message: '已排除其他原因且鐵存量充足。請進行 ESA/HIF-PHI 評估。',
      recommendationType: 'treatment' // Green/Positive
    };
  }

  // If specific causes found
  const findings: string[] = [];
  if (data.workupSmear) findings.push('周邊血液抹片異常：轉診血液科');
  if (data.workupHemolysis) findings.push('溶血 (結合珠蛋白/LDH)：轉診血液科');
  if (data.workupInflammation) findings.push('CRP 升高（發炎）：追蹤並治療潛在疾病');
  if (data.workupB12Folate) findings.push('維生素 B12/葉酸缺乏：治療缺乏症');
  if (data.workupLiver) findings.push('肝功能異常：轉診肝膽腸胃科');
  if (data.workupThyroid) findings.push('甲狀腺功能異常 (TSH)：轉診內分泌科');
  if (data.workupParathyroid) findings.push('甲狀腺功能亢進 (PTH)：治療甲狀旁腺功能亢進');
  if (data.workupMyeloma) findings.push('懷疑骨髓瘤 (M蛋白/輕鏈)：轉診腫瘤科');
  if (data.workupParasites) findings.push('檢測到寄生蟲：轉診感染科');

  return {
    status: 'stop',
    title: '治療潛在病因',
    message: '已確認非腎性病因。在考慮腎性貧血治療前先解決這些問題。',
    details: findings,
    recommendationType: 'urgent' // Red/Urgent
  };
};

export const evaluateESA = (data: PatientState): DecisionResult => {
  // Check Hb Threshold
  if (data.hb === '' || data.hb > 10) {
    return {
      status: 'stop',
      title: '建議觀察',
      message: 'Hb 目前高於啟動 ESA 的典型閾值 (> 10 g/dL)。',
      details: ['每 2-4 週監測一次 Hb。', '通常在 Hb < 10 g/dL 時考慮啟動治療。'],
      recommendationType: 'info'
    };
  }

  // --- Priority 1: Tier 1 (Clinical History) ---

  // 1a. Absolute Hold
  if (data.currentStrokeOrThrombosis) {
    return {
      status: 'stop',
      title: '暫停治療',
      message: '檢測到近期中風或血栓。',
      details: ['立即暫停 ESA 和 HIF-PHI 治療。', '穩定後重新評估。'],
      recommendationType: 'urgent'
    };
  }

  // Identify Tier 1 Conditions favoring ESA (Safety / Contraindications for HIF-PHI)
  const tier1FavorESA: string[] = [];
  if (data.isPregnant) tier1FavorESA.push('懷孕');
  if (data.activeMalignancy) tier1FavorESA.push('活動性惡性腫瘤');
  if (data.historyOfCancer) tier1FavorESA.push('癌症病史（未完全緩解 2-5 年）');
  if (data.polycysticKidneyDisease) tier1FavorESA.push('多囊腎');
  if (data.proliferativeRetinalDisease) tier1FavorESA.push('增殖性視網膜病變');
  if (data.pulmonaryArterialHypertension) tier1FavorESA.push('肺動脈高壓');
  if (data.hepaticImpairment) tier1FavorESA.push('肝功能損害');
  if (data.priorCVEvents) tier1FavorESA.push('既往心血管事件（中風/心肌梗塞）');
  if (data.priorThromboembolicEvents) tier1FavorESA.push('既往血栓栓塞事件（DVT、血管通路血栓、PE）');

  // *** Conflict Check: ESA Intolerance AND Conditions favoring ESA ***
  // If patient cannot tolerate ESA but has conditions where HIF-PHI is cautioned against.
  if (data.esaIntolerance && tier1FavorESA.length > 0) {
    return {
      status: 'stop',
      title: '共同決策 (SDM)',
      message: '必須仔細討論潛在的好處和壞處。輸血可能是唯一的選擇。',
      details: [
        '檢測到衝突：',
        '- 患者有 ESA 不耐受（禁忌使用 ESA）。',
        '- 患者有通常不建議使用 HIF-PHI 的情況：',
        ...tier1FavorESA.map(r => `  ** ${r}`),
        '考慮專家諮詢（血液科/腎臟科）。'
      ],
      recommendationType: 'urgent'
    };
  }

  // 1b. Favors ESA (Safety / Contraindications for HIF-PHI)
  if (tier1FavorESA.length > 0) {
    return {
      status: 'stop',
      title: '建議：ESA',
      message: '臨床病史顯示 ESA 為首選。',
      details: [
        'HIF-PHI 相對禁忌症或需謹慎使用：',
        ...tier1FavorESA,
        '這些情況下通常不建議使用 HIF-PHI 或需謹慎使用。',
        '使用最低有效劑量。'
      ],
      recommendationType: 'treatment'
    };
  }

  // 1c. Favors HIF-PHI (Intolerance to ESA)
  if (data.esaIntolerance) {
    return {
      status: 'stop',
      title: '建議：HIF-PHI',
      message: '臨床病史（ESA 不耐受）顯示 HIF-PHI 為首選。',
      details: [
        '建議原因（ESA 不耐受）：',
        '無法耐受 ESA（過敏、高血壓、凝血）',
        '每 2-4 週監測一次 Hb。'
      ],
      recommendationType: 'treatment'
    };
  }

  // --- Priority 2: Tier 2 (Clinical Preference / Status) ---
  const tier2Reasons: string[] = [];
  if (data.esaHyporesponsive) tier2Reasons.push('ESA 低反應性');
  if (data.highCRP) tier2Reasons.push('CRP 升高 (>0.3 mg/dl)');

  if (tier2Reasons.length > 0) {
    return {
      status: 'stop',
      title: '建議：HIF-PHI',
      message: '臨床狀況顯示 HIF-PHI 為首選替代方案。',
      details: [
        '建議原因：',
        ...tier2Reasons,
        '如果 3-4 個月後反應不足，請停藥。',
        '每 2-4 週監測一次 Hb。'
      ],
      recommendationType: 'treatment'
    };
  }

  // --- Priority 3: Tier 3 (Patient Preferences & Logistics) ---
  const tier3Reasons: string[] = [];
  if (data.preference === 'Oral') tier3Reasons.push('患者偏好口服藥物');
  if (!data.accessToRefrigeration) tier3Reasons.push('無法取得冷藏設備');

  if (tier3Reasons.length > 0) {
    return {
      status: 'stop',
      title: '建議：HIF-PHI',
      message: '患者偏好或後勤因素傾向 HIF-PHI。',
      details: [
        '建議原因：',
        ...tier3Reasons,
        '如果 3-4 個月後反應不足，請停藥。'
      ],
      recommendationType: 'treatment'
    };
  }

  // --- Default ---
  return {
    status: 'stop',
    title: '建議：ESA',
    message: '標準一線治療。',
    details: [
      '未符合其他特定優先建議條件。',
      'ESA 是標準治療（靜脈/皮下）。',
      '每 2-4 週監測一次 Hb。',
      '不要將 Hb 維持在 >= 11.5 g/dL。'
    ],
    recommendationType: 'treatment'
  };
};