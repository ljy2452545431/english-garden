export interface OfficialMaterial {
  id: string;
  title: string;
  provider: string;
  skill: 'listening' | 'reading' | 'writing' | 'speaking';
  scope: 'full' | 'tasks';
  format: string;
  questionCount?: number;
  minutes: number;
  sourceUrl: string;
  url: string;
  answerUrl?: string;
  embedUrl?: string;
  documentUrl?: string;
  description: string;
  verifiedAt: string;
  audioSamples?: readonly { title: string; url: string; documentUrl: string }[];
}

const academicSource = 'https://ielts.org/take-a-test/preparation-resources/sample-test-questions/academic-test';
const idpSource = 'https://ielts.idp.com/about/ielts-familiarisation-tests';
const verifiedAt = '2026-10-08';

/** 仅收录官方公开入口。各站复用的同一机考样卷不重复计为多套试卷。 */
export const officialMaterials: readonly OfficialMaterial[] = [
  {
    id: 'official-listening-1', title: '官方听力完整机考样卷', provider: 'IELTS / IDP',
    skill: 'listening', scope: 'full', format: '4 个部分 · 40 题', questionCount: 40, minutes: 30,
    sourceUrl: idpSource,
    url: 'https://demo-ielts.inspera.com/player/?assessmentRunId=131012334&context=exam#/section/128121996/question/128121965/scorableItem/1',
    embedUrl: 'https://demo-ielts.inspera.com/player/?assessmentRunId=131012334&context=exam',
    answerUrl: 'https://assets.ctfassets.net/unrdeg6se4ke/8gOk8aDHMcnNLLxthyKt0/36be49c5e37d33f8b70606d0bd2af1d7/IELTS_familiarisation_test_Listening_answers.pdf',
    description: '使用官方录音和题目，音频在官方机考页面播放；每段只听一遍。30 分钟为训练预算，正式机考末尾检查时间以报名考试说明为准。', verifiedAt,
  },
  {
    id: 'official-reading-1', title: '官方学术阅读完整机考样卷', provider: 'IELTS / IDP',
    skill: 'reading', scope: 'full', format: '3 篇文章 · 40 题', questionCount: 40, minutes: 60,
    sourceUrl: idpSource,
    url: 'https://demo-ielts.inspera.com/player/?assessmentRunId=131013388&context=exam#/section/128121930/question/128121896/scorableItem/1',
    embedUrl: 'https://demo-ielts.inspera.com/player/?assessmentRunId=131013388&context=exam',
    answerUrl: 'https://assets.ctfassets.net/unrdeg6se4ke/2ggjbjdFDSU7xXTp7Eqxjp/ef3ce074fbb5d9e47db8ee4b3ad45cb0/IELTS_familiarisation_test_Reading_answers.pdf',
    description: '学术类 Academic 阅读整卷。60 分钟包含填写答案的时间；不要把培训类 General Training 的阅读计分标准混用。', verifiedAt,
  },
  {
    id: 'official-writing-1', title: '官方学术写作完整机考样卷', provider: 'IELTS / IDP',
    skill: 'writing', scope: 'full', format: 'Task 1 + Task 2', minutes: 60,
    sourceUrl: idpSource,
    url: 'https://demo-ielts.inspera.com/player/?assessmentRunId=131013741&context=exam#/section/128125100/question/128121843/scorableItem/1',
    embedUrl: 'https://demo-ielts.inspera.com/player/?assessmentRunId=131013741&context=exam',
    answerUrl: 'https://ielts.org/cdn/computer-delivered-sample-tests-academic-writing/ielts-academic-writing-example-responses-to-parts-1-and-2-with-band-scores-and-examiner-comments.pdf',
    description: 'Task 1 至少 150 词，建议 20 分钟；Task 2 至少 250 词，建议 40 分钟。官方范文是评分示例，不能视为这套完整样卷的唯一标准答案。', verifiedAt,
  },
  {
    id: 'official-speaking', title: '官方口语三部分样题与录音', provider: 'IELTS / IDP',
    skill: 'speaking', scope: 'tasks', format: 'Part 1 / Part 2 / Part 3 样例', minutes: 14,
    sourceUrl: 'https://ielts.idp.com/prepare/all-test-types/all-skills/practice-test',
    url: 'https://ielts.org/cdn/ielts-downloadable-assets/ielts-sample-tests/ielts-speaking-sample-tasks-2023.pdf',
    documentUrl: 'https://ielts.org/cdn/ielts-downloadable-assets/ielts-sample-tests/ielts-speaking-sample-tasks-2023.pdf',
    description: '两人轮流扮演考生与提问者。三段音频展示真实口语互动；提示与逐字稿用于听后复盘，没有唯一标准答案，也不自动产生雅思分数。', verifiedAt,
    audioSamples: [
      { title: 'Part 1 · 官方口语示例', url: 'https://assets.ctfassets.net/unrdeg6se4ke/i05RGjkPNBP9BFtAJeDdI/8771c7f6ecd7b675e038f7885942c1d4/speakingsamplepart1recording.mp3', documentUrl: 'https://assets.ctfassets.net/unrdeg6se4ke/2xGGVzn9Uqaw4D2zy3AKkG/ef2348814527d3c1d1273b2d8a1473c0/Free_practice_test_-_Speaking_-_Part_1_-_Prompt___Transcript_-_Global.pdf' },
      { title: 'Part 2 · 官方口语示例', url: 'https://assets.ctfassets.net/unrdeg6se4ke/1ERW6C8VmZnN42VT1CVjeO/9526d36233501a9e8f565ecff863c57a/speakingsamplepart2recording.mp3', documentUrl: 'https://assets.ctfassets.net/unrdeg6se4ke/4ttom7DpGvfWJ1eEkVYg0r/60995be89a169f0b4051b087bef6176c/Free_practice_test_-_Speaking_-_Part_2_-_Prompt___Transcript_-_Global.pdf' },
      { title: 'Part 3 · 官方口语示例', url: 'https://assets.ctfassets.net/unrdeg6se4ke/5OT4vX7czwdTEztgNtVpIW/0059600017a053466049ace3f2ebc630/speakingsamplepart3recording.mp3', documentUrl: 'https://assets.ctfassets.net/unrdeg6se4ke/22xqH3ABVF5MJTfnFv5ftw/1903c0ce930e19875009389b3fdb731c/Free_practice_test_-_Speaking_-_Part_3_-_Prompt___Transcript_-_Global.pdf' },
    ],
  },
  {
    id: 'official-reading-tfng', title: '官方阅读判断题专项', provider: 'IELTS',
    skill: 'reading', scope: 'tasks', format: 'True / False / Not Given 单项样题', questionCount: 3, minutes: 10,
    sourceUrl: academicSource,
    url: 'https://ielts.inspera.com/player/?assessmentRunId=189698592&context=exam',
    answerUrl: 'https://ielts.org/cdn/computer-delivered-sample-tests-academic-reading/ielts-academic-reading-computer-delivered-identifying-information-true-flase-not-given-answer-key.pdf',
    description: '短题型样例，适合首次接触判断题；10 分钟是本站建议练习时间，不是官方整卷限时。', verifiedAt,
  },
  {
    id: 'official-listening-tasks', title: '官方听力题型与答案资料包', provider: 'British Council',
    skill: 'listening', scope: 'tasks', format: '题型合集 · 33 页 PDF', minutes: 15,
    sourceUrl: 'https://takeielts.britishcouncil.org/prepare/ielts-free-practice-mock-tests/academic/listening',
    url: 'https://takeielts.britishcouncil.org/sites/default/files/%5Bdownloads%5D/ielts-listening-sample-tasks-2023.pdf',
    documentUrl: 'https://takeielts.britishcouncil.org/sites/default/files/%5Bdownloads%5D/ielts-listening-sample-tasks-2023.pdf',
    description: '题型、录音文字与答案合集，不是四段连续录音的整卷；15 分钟为单次复盘建议。听辨练习请使用上方完整听力机考样卷。', verifiedAt,
  },
];
