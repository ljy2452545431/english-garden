"""构建可复跑的原创微课程；不抓取或复制付费题册。"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent
OUT = ROOT / 'src' / 'data'
OUT.mkdir(parents=True, exist_ok=True)

# 每条阅读与对话均独立编写。题目的 evidence 必须是原文连续片段。
# title | reading | listening | three reading facts | three listening facts
SCENARIOS = [
('起步与自我介绍',
 'My name is Lin. I am nineteen. I am a student in Chengdu. My major is history. My friend is Mei. She is twenty and studies art. We meet in the library on Monday. We study English for one hour. I like short stories. Mei likes music. We are beginners, but we help each other. Today I can say my name, my city and my major in English.',
 'Lin: Hi, I am Lin. What is your name? Mei: My name is Mei. Lin: Where are you from? Mei: I am from Suzhou. Lin: Are you a student? Mei: Yes. I study art. Lin: When can we practise English? Mei: At seven in the evening. Lin: Good. Let us talk for fifteen minutes. Mei: Yes. Please speak slowly.',
 [('What does Lin study?', 'history', 'art', 'music'), ('Where do the friends meet?', 'the library', 'a shop', 'a station'), ('How long do they study English?', 'one hour', 'two hours', 'ten minutes')],
 [('Where is Mei from?', 'Suzhou', 'Chengdu', 'Beijing'), ('What time can they practise?', 'seven', 'six', 'nine'), ('How many minutes will they talk?', 'fifteen', 'fifty', 'five')]),
('日常生活',
 'Bo gets up at seven. He has breakfast at home. He usually walks to university. His first class starts at nine. At noon he eats with his friends. He studies English after dinner. He reads for twenty minutes and then talks to his partner. He does not watch videos during practice. On Sunday he gets up at eight and reviews his notes. A small routine helps him remember new words.',
 'Ana: Do you study in the morning? Bo: No, I study after dinner. Ana: I study at eight in the morning. Bo: Do you practise every day? Ana: Yes, but on Saturday I only review. Bo: I walk to university. What about you? Ana: I take the bus. Bo: Can we talk tonight? Ana: Yes, at eight thirty.',
 [('When does Bo get up on weekdays?', 'seven', 'eight', 'nine'), ('How does Bo usually travel to university?', 'walks', 'drives', 'cycles'), ('When does Bo study English?', 'after dinner', 'before breakfast', 'at noon')],
 [('When does Ana study?', 'eight in the morning', 'seven at night', 'after dinner'), ('What does Ana do on Saturday?', 'review', 'take a test', 'learn fifty words'), ('How does Ana travel?', 'the bus', 'a taxi', 'a bike')]),
('家庭与朋友',
 'This is a photo of my family. My mother is a nurse. My father is a cook. I have one brother. His name is Kai. He is ten. Our home is near a park. On Saturdays we cook lunch together. My friend Sara sometimes joins us. Her parents live in another city. Sara brings fruit, and my brother washes it. We have different jobs, but everyone helps.',
 'Kai: Is this your sister? Sara: No, she is my cousin, Eva. Kai: What does she do? Sara: She is a teacher. Kai: Where does she live? Sara: In Nanjing. Kai: How many children does she have? Sara: Two. This is her son, and that is her daughter. Kai: Are these your books? Sara: Yes, the blue books are mine.',
 [('What is the mother’s job?', 'a nurse', 'a teacher', 'a driver'), ('How many brothers does the writer have?', 'one brother', 'two brothers', 'three brothers'), ('What does Sara bring?', 'fruit', 'bread', 'flowers')],
 [('Who is Eva?', 'my cousin', 'my sister', 'my aunt'), ('Where does Eva live?', 'Nanjing', 'Suzhou', 'Wuhan'), ('Which books belong to Sara?', 'the blue books', 'the red books', 'the green books')]),
('校园与地点',
 'Our campus is small. There is a library next to the main gate. The dining hall is behind the library. There are two classrooms above the music room. A garden is between the sports hall and the dormitory. Students can sit there after class. The library opens at eight, but the music room opens at ten. There is no cafe on campus. We buy tea at a shop across the road.',
 'Visitor: Excuse me, where is the library? Guide: Go straight from the gate. It is on your left. Visitor: Is the dining hall next to it? Guide: It is behind it. Visitor: Where can I play basketball? Guide: In the sports hall. Turn right at the garden. Visitor: When does the library open? Guide: At eight. It closes at six.',
 [('Where is the dining hall?', 'behind the library', 'inside the library', 'across the road'), ('How many classrooms are above the music room?', 'two classrooms', 'three classrooms', 'five classrooms'), ('Which room opens at ten?', 'the music room', 'the library', 'the dining hall')],
 [('Which side is the library on from the gate?', 'your left', 'your right', 'both sides'), ('Where should the visitor turn right?', 'the garden', 'the gate', 'the shop'), ('When does the library close?', 'six', 'eight', 'ten')]),
('食物与购物',
 'Lena goes to a small market. She needs some rice, three apples and a bottle of milk. She has bread at home, so she does not buy any bread. The apples cost six yuan. The milk costs ten yuan. She brings her own bag. The seller asks if she wants oranges. Lena says no because her friend already has some. At home, the friends make lunch and share the fruit.',
 'Seller: What would you like? Lena: Two bananas and a bottle of water, please. Seller: Anything else? Lena: Do you have any eggs? Seller: Yes, six eggs are twelve yuan. Lena: I will take six. Seller: The bananas are four yuan and the water is three. Lena: Here is twenty yuan. Seller: Your change is one yuan.',
 [('How many apples does Lena need?', 'three apples', 'two apples', 'five apples'), ('Why does she not buy bread?', 'bread at home', 'bread is expensive', 'the shop is closed'), ('How much is the milk?', 'ten yuan', 'six yuan', 'three yuan')],
 [('How many bananas does Lena order?', 'Two bananas', 'Three bananas', 'Six bananas'), ('How much are six eggs?', 'twelve yuan', 'six yuan', 'twenty yuan'), ('What is her change?', 'one yuan', 'three yuan', 'four yuan')]),
('兴趣与运动',
 'Omar likes playing badminton. He can play quite well, but he cannot swim. His friend Li can swim and likes teaching beginners. They meet at the sports centre on Friday. First they play badminton for half an hour. Then Li shows Omar how to move in the water. Omar starts in the shallow pool. They do not compete. Their aim is to learn one new skill and enjoy the evening.',
 'Coach: Welcome to the club. Can you run for ten minutes? Omar: Yes, but I cannot run fast. Coach: That is fine. Do you like team games? Omar: I like badminton. Coach: Our beginner group meets on Tuesday, not Friday. Omar: What should I bring? Coach: Water and clean shoes. We have rackets here.',
 [('What can Omar do well?', 'badminton', 'swim', 'dance'), ('Where does Omar begin swimming?', 'the shallow pool', 'the deep pool', 'the river'), ('What is their aim?', 'learn one new skill', 'win a competition', 'become coaches')],
 [('Which group day is confirmed?', 'Tuesday', 'Friday', 'Sunday'), ('What shoes should Omar bring?', 'clean shoes', 'winter boots', 'no shoes'), ('What equipment does the club provide?', 'rackets', 'water', 'towels')]),
('过去的经历',
 'Last Saturday, Jia visited a science museum with her friend. They arrived at ten and bought tickets at the door. Jia saw a small robot. It moved a box but did not speak. Her friend tried a weather game. After two hours, they ate lunch outside. Jia lost her umbrella near the cafe. A staff member found it and gave it back. The day was rainy, but Jia enjoyed the visit.',
 'Friend: Did you enjoy the museum? Jia: Yes. I liked the robot. Friend: Did you buy a gift? Jia: No, I bought a postcard. Friend: How did you get there? Jia: We took the underground. Friend: What time did you leave? Jia: At three. We wanted to leave at two, but we stayed for a talk.',
 [('When did Jia visit the museum?', 'Last Saturday', 'Last Monday', 'Last Friday'), ('What did the robot move?', 'a box', 'an umbrella', 'a ticket'), ('Who found the umbrella?', 'A staff member', 'her friend', 'a child')],
 [('What did Jia buy?', 'a postcard', 'a toy', 'a book'), ('How did they travel?', 'the underground', 'a taxi', 'a bus'), ('What time did they actually leave?', 'three', 'two', 'four')]),
('旅行与交通',
 'Nora planned a day trip to a lake. The direct bus left at nine, but she missed it. She took the ten o’clock train to Hill Town instead. From the station, she walked east for fifteen minutes and reached the lake. She rented a bike for one hour. In the afternoon, rain started, so she returned the bike early. She went home by bus at five. Next time she will check the timetable before leaving.',
 'Clerk: Where are you going? Nora: Hill Town. Is the nine thirty train still available? Clerk: It has been cancelled. The next train leaves at ten fifteen from platform four. Nora: How much is a return ticket? Clerk: Thirty pounds. Nora: Can I use it tomorrow? Clerk: No, this ticket is only for today.',
 [('Why did Nora take a train?', 'missed it', 'the bus was expensive', 'she disliked buses'), ('Which direction did she walk from the station?', 'east', 'west', 'north'), ('Why did she return the bike early?', 'rain started', 'it broke', 'she lost the key')],
 [('What time is the next train?', 'ten fifteen', 'nine thirty', 'ten thirty'), ('Which platform is announced?', 'platform four', 'platform two', 'platform six'), ('How much is a return ticket?', 'Thirty pounds', 'Thirteen pounds', 'Forty pounds')]),
('未来的打算',
 'Eva and Tom are going to learn English together. They are going to practise at eight each evening. Eva will read short stories because she enjoys them. Tom is going to write three sentences after each lesson. Neither wants to book an exam yet. They will review their progress after twelve weeks. If a lesson is too difficult, they will repeat it. They hope a simple plan will be easier to keep than a long list of apps.',
 'Tom: Shall we study at seven tomorrow? Eva: I have a class then. Can we start at eight? Tom: Yes. I am going to read the story first. Eva: I will prepare three questions. Tom: What will we do on Sunday? Eva: Review our recordings. We are not going to start a new chapter. Tom: Good. I will set a reminder.',
 [('When will they practise each evening?', 'eight', 'seven', 'nine'), ('What is Tom going to write?', 'three sentences', 'a long essay', 'ten pages'), ('When will they review progress?', 'twelve weeks', 'two weeks', 'one day')],
 [('What time is agreed for tomorrow?', 'eight', 'seven', 'six'), ('What will Eva prepare?', 'three questions', 'a new chapter', 'a test paper'), ('What will they review on Sunday?', 'our recordings', 'a film', 'a shopping list')]),
('比较与选择',
 'Two students compare study rooms. Room A is smaller than Room B, but it is quieter. Room B has more chairs and a larger window. Both rooms have free internet. Room A closes at six, while Room B closes at nine. Mia prefers Room A for reading in the afternoon. Sam chooses Room B because he finishes work at seven. The best choice depends on when and how someone studies, not simply on the size of the room.',
 'Mia: Which headphones should we buy? Sam: Model Blue is cheaper. It costs twenty pounds. Mia: Model Green costs thirty, but it is lighter. Sam: Does either have a microphone? Mia: Both do. Sam: I travel every day, so weight matters more to me. I will choose Green. Mia: I will choose Blue because my budget is twenty.',
 [('Which room is quieter?', 'Room A', 'Room B', 'neither room'), ('When does Room B close?', 'nine', 'six', 'seven'), ('Why does Sam choose Room B?', 'finishes work at seven', 'it is smaller', 'it has no internet')],
 [('Which model is cheaper?', 'Model Blue', 'Model Green', 'the same price'), ('Which model is lighter?', 'Model Green', 'Model Blue', 'neither model'), ('What is Mia’s budget?', 'twenty', 'thirty', 'forty')]),
('健康与建议',
 'Ben often studies late and feels tired in morning classes. His friend suggests a regular bedtime. Ben decides to stop using his phone thirty minutes before bed. He also puts a bottle of water on his desk. He should take a short break after sitting for a long time. He must not treat online advice as a medical diagnosis. If his tiredness continues, he will ask a qualified professional. This week he records his sleep time rather than buying a new supplement.',
 'Ben: I feel tired after studying. Friend: What time do you go to bed? Ben: Around one. Friend: Could you try an earlier bedtime? Ben: Yes. Should I exercise at midnight? Friend: I cannot give medical advice. Perhaps start with a short walk in the afternoon. Ben: I can do that at four. Friend: If you still feel unwell, ask a professional.',
 [('When will Ben stop using his phone?', 'thirty minutes before bed', 'during breakfast', 'after midnight'), ('What will he record this week?', 'his sleep time', 'his exam score', 'his weight'), ('Who should he ask if tiredness continues?', 'a qualified professional', 'a supplement seller', 'a stranger online')],
 [('When does Ben usually go to bed?', 'Around one', 'Around nine', 'Around ten'), ('When can Ben walk?', 'four', 'midnight', 'seven'), ('Which activity does the friend suggest?', 'a short walk', 'a difficult race', 'exercise at midnight')]),
('基础阶段检查',
 'Twelve weeks ago, Yun could only introduce herself with two sentences. Now she can describe her routine, talk about a trip and make a simple plan. She still finds fast speech difficult. On Sunday, she reads a new short story without a dictionary. She answers three of four questions correctly. Then she records a one-minute introduction. Her partner understands the main ideas. Yun will spend two more weeks on listening before choosing harder lessons. Repeating a stage is a useful decision, not a failure.',
 'Partner: How was your new reading task? Yun: I got three answers right out of four. Partner: Did you use a dictionary? Yun: Not during the task. I checked two words afterwards. Partner: What is still difficult? Yun: Fast speech. Partner: What is your next step? Yun: Two more weeks of short listening practice. I am not booking an exam yet.',
 [('Which skill is still difficult for Yun?', 'fast speech', 'writing her name', 'reading every word'), ('How many reading answers were correct?', 'three of four', 'one of four', 'four of four'), ('What will Yun do next?', 'two more weeks on listening', 'book an exam immediately', 'stop studying')],
 [('How many words did Yun check afterwards?', 'two words', 'ten words', 'no words'), ('When did she use the dictionary?', 'afterwards', 'during the task', 'before every question'), ('What is Yun not doing yet?', 'booking an exam', 'recording her voice', 'reading stories')]),
]

def question(identifier, prompt, correct, wrong1, wrong2, explanation):
    options = [correct, wrong1, wrong2]
    shift = sum(ord(c) for c in identifier) % 3
    options = options[shift:] + options[:shift]
    return {'id': identifier, 'prompt': prompt, 'options': options,
            'answer': options.index(correct), 'explanation': explanation}

def passage_questions(week, section, text, facts):
    result = []
    for i, (prompt, evidence, wrong1, wrong2) in enumerate(facts):
        assert evidence in text, (week, section, evidence)
        result.append(question(f'w{week}-{section}-{i+1}', prompt, evidence, wrong1, wrong2,
                               f'原文定位：“{evidence}”。先找到对应句，再比较选项；不要只凭主题猜测。'))
    # 未提及的信息不能用常识填补。True/False/Not Given 不与作者观点混用。
    if section == 'r':
        claim, correct, evidence = READING_JUDGMENTS[week-1]
        alternatives = [option for option in ('True', 'False', 'Not Given') if option != correct]
        result.append(question(f'w{week}-{section}-4', 'True / False / Not Given: ' + claim,
                               correct, *alternatives, evidence))
        return result
    return result

GRAMMARS = [
 ('be 动词与人称代词', 'I 用 am，you/we/they 用 are，he/she/it 用 is。否定在 be 后加 not；问句把 be 放到主语前。先练清楚短句。', ['I am a student.', 'She is my partner.', 'Are you ready?'], [('I ___ a beginner.', 'am', 'is', 'are'), ('Mei ___ from Suzhou.', 'is', 'am', 'are'), ('___ you students?', 'Are', 'Is', 'Am')]),
 ('一般现在时与频率词', '一般现在时描述习惯。第三人称单数动词通常加 s；频率副词常在普通动词前、be 后。否定用 do not / does not 加动词原形。', ['I usually study at eight.', 'He reads every day.', 'She does not watch TV during practice.'], [('He ___ English every day.', 'studies', 'study', 'studying'), ('I ___ walk to class.', 'usually', 'yesterday', 'tomorrow'), ('She does not ___ late.', 'sleep', 'sleeps', 'sleeping')]),
 ('名词单复数与物主词', '通常名词复数加 s；person→people 等要单记。my/your/his/her/our/their 后接名词；mine/yours/hers 独立使用。不要用 she 替代 her books 中的 her。', ['These are my books.', 'The blue bag is hers.', 'Two children are here.'], [('These are ___ books. (she)', 'her', 'she', 'hers'), ('I have two ___.', 'brothers', 'brother', 'brotheres'), ('That bag is ___. (I)', 'mine', 'my', 'me')]),
 ('there be 与方位介词', 'There is 后接单数或不可数名词，There are 后接复数。next to 是紧邻，behind 是后方，between 常连接两个位置。地图要先确定参照点。', ['There is a library near the gate.', 'There are two rooms upstairs.', 'The garden is between the halls.'], [('There ___ two classrooms.', 'are', 'is', 'am'), ('The hall is ___ the library. (在后方)', 'behind', 'under', 'inside'), ('There ___ a garden.', 'is', 'are', 'be')]),
 ('可数不可数与 some/any', 'rice/water 通常不可数，不能直接加复数 s；可用 a bottle of water。肯定句常用 some；一般否定和疑问句常用 any，提供或请求时也可用 some。', ['We have some rice.', 'Do you have any eggs?', 'I need a bottle of milk.'], [('I do not have ___ bread.', 'any', 'many', 'a'), ('We need three ___.', 'apples', 'rice', 'milk'), ('There is ___ water in the bottle.', 'some', 'many', 'a')]),
 ('can 与 like doing', 'can 后接动词原形，否定为 cannot/can’t。like doing 表示喜欢某活动。能够做与喜欢做是两个不同信息，答题时不要互换。', ['I can swim.', 'She cannot run fast.', 'He likes playing badminton.'], [('She can ___ well.', 'swim', 'swims', 'swimming'), ('I like ___ stories.', 'reading', 'reads', 'readed'), ('He ___ speak French. (不能)', 'cannot', 'can', 'likes')]),
 ('一般过去时', '过去发生且结束的事用过去时。规则动词加 ed；go→went、buy→bought、see→saw。did not 后用原形。先用 yesterday/last week 建立时间。', ['We visited a museum.', 'I bought a postcard.', 'She did not lose her ticket.'], [('Yesterday I ___ a robot.', 'saw', 'see', 'seen'), ('He did not ___ a gift.', 'buy', 'bought', 'buys'), ('We ___ at ten last Saturday.', 'arrived', 'arrive', 'arriving')]),
 ('过去时问句与时间表达', '一般过去时问句用 Did + 主语 + 动词原形；be 的过去式 was/were 直接倒装。at 用于时刻，on 用于具体日期，in 用于月年。', ['Did you take the train?', 'Where were you yesterday?', 'We left at five.'], [('Did she ___ the bus?', 'miss', 'missed', 'misses'), ('We left ___ five o’clock.', 'at', 'on', 'in'), ('Where ___ you yesterday?', 'were', 'are', 'did')]),
 ('will 与 be going to', 'be going to 常表达已作的打算；will 常表达当下决定、预测或承诺。两者后都接动词原形。时间已定的安排也可以用现在进行时，后面再学。', ['We are going to practise tonight.', 'I will help you.', 'She is going to read a story.'], [('She is going to ___ tonight.', 'study', 'studies', 'studied'), ('I ___ help you tomorrow. (承诺)', 'will', 'did', 'was'), ('We ___ going to meet at eight.', 'are', 'is', 'am')]),
 ('比较级与最高级', '短形容词通常加 er/est，长形容词用 more/most；good→better→best。比较级常与 than 连用；比较时说明维度，不把更大等同更好。', ['Room A is quieter than Room B.', 'This is the most useful tool.', 'The second plan is better.'], [('This room is ___ than that one.', 'quieter', 'quietest', 'quiet'), ('This is the ___ useful tool.', 'most', 'more', 'much'), ('My new plan is ___ than the old one.', 'better', 'best', 'good')]),
 ('should / must / have to', 'should 提建议；must 表强制或强烈义务；have to 常表示外部要求。must not 是禁止，do not have to 是不必，含义不同。健康材料中的练习不是医疗建议。', ['You should take a break.', 'You must not copy answers.', 'You do not have to buy an app.'], [('You ___ take a short break. (建议)', 'should', 'did', 'are'), ('You must not ___ during this task.', 'cheat', 'cheats', 'cheated'), ('You do not have to buy it means ___.', 'Buying it is optional.', 'Buying it is forbidden.', 'Buying it is compulsory.')]),
 ('基础语法综合复习', '先确定时间，再检查主语和动词。today/every day 往往提示习惯或现在，yesterday 提示过去，next week 提示未来。不要机械依靠一个时间词，要看完整意思。', ['I practise every day.', 'Yesterday I recorded my voice.', 'Next week I will try a new lesson.'], [('Yesterday she ___ a story.', 'read', 'reads', 'reading'), ('He ___ every evening.', 'practises', 'practise', 'practised tomorrow'), ('We are going to ___ our notes.', 'review', 'reviewed', 'reviews')]),
 ('because / although / so', 'because 引出原因，although 引出让步，so 引出结果。英语中通常不用 although 与 but 重复连接同一个句子。说明因果时要提供证据，不等于两件事同时发生就有因果。', ['I review because I forget easily.', 'Although it was difficult, I continued.', 'The room was full, so we waited.'], [('___ it was raining, we walked.', 'Although', 'Because of', 'So'), ('I used notes ___ they helped me focus.', 'because', 'although but', 'so that because'), ('The bus was late, ___ we missed the start.', 'so', 'because', 'although')]),
 ('现在进行时与一般现在时', 'am/is/are + doing 描述正在发生或暂时进行的事；一般现在时描述惯常情况。now/this week 与 usually 能帮助理解，但仍以意思为准。', ['I usually work at home.', 'This week I am working in the library.', 'She is preparing a presentation now.'], [('Right now he ___ a report.', 'is writing', 'writes every day', 'wrote yesterday'), ('She usually ___ at nine.', 'starts', 'is start', 'starting'), ('They ___ learning a new skill this week.', 'are', 'is', 'am')]),
 ('现在完成时', 'have/has + 过去分词表示过去与现在的联系，常与 since/for/already/yet 连用。明确结束的过去时间如 yesterday 一般用过去时。since 加起点，for 加时长。', ['The city has changed.', 'I have lived here for two years.', 'She has not finished yet.'], [('He has lived here ___ 2022.', 'since', 'for', 'during'), ('We have ___ the task.', 'finished', 'finish', 'finishing'), ('I ___ the park yesterday.', 'visited', 'have visited yesterday', 'visiting')]),
 ('定语从句入门', 'who 描述人，which/that 描述物。定语从句紧接被修饰名词；先保证主句完整，再补充信息。避免重复主语，如 the app which it helps。', ['A teacher who listens can help.', 'I use an app that saves notes.', 'The tool which we tested was simple.'], [('A friend ___ helps me is valuable.', 'who', 'where', 'when'), ('This is a tool ___ records sound.', 'that', 'who', 'what it'), ('Which sentence is complete?', 'The app that I use is free.', 'The app that I use it is free.', 'The app that free.')]),
 ('代词指代与衔接', 'this/it/they 的指代要明确；this 加名词往往更清楚。用 however 表转折、therefore 表结果，不能仅为了增加连接词而堆叠。', ['This arrangement saves time.', 'The students arrived. They sat down.', 'The plan was costly; however, it was effective.'], [('The students arrived. ___ sat down.', 'They', 'It', 'He'), ('The plan was expensive; ___, it worked well.', 'however', 'because', 'for example because'), ('Which phrase has the clearest reference?', 'This weekly meeting', 'This thing it that', 'They it')]),
 ('过去时与完成时对比', 'finished past 用过去时；到现在仍有影响的经历或状态可用完成时。Have you ever...? 询问经历，When did...? 询问具体过去时间。', ['I saw the film last Friday.', 'I have seen that film twice.', 'When did you see it?'], [('I ___ the film last Friday.', 'saw', 'have seen last Friday', 'seen'), ('Have you ever ___ a concert?', 'attended', 'attend', 'attending'), ('When ___ you watch it?', 'did', 'have', 'are')]),
 ('零条件句与第一条件句', '零条件句 if + 现在时，主句现在时，表一般规律；第一条件句 if + 现在时，主句 will + 原形，表现实的将来可能。if 从句不用 will 表这种普通将来条件。', ['If water freezes, it becomes ice.', 'If it rains tomorrow, we will stay inside.', 'If you practise, you will improve.'], [('If it ___ tomorrow, we will stay home.', 'rains', 'will rain', 'rained yesterday'), ('If water freezes, it ___ ice.', 'becomes', 'will became', 'become yesterday'), ('If you practise, you ___ improve.', 'will', 'did', 'were')]),
 ('被动语态基础', 'be + 过去分词强调动作承受者。一般现在被动 am/is/are done，过去被动 was/were done。by 用于必要的施动者；不知道谁做时不必强写。', ['Paper is collected here.', 'The bins were installed last year.', 'The data are checked weekly.'], [('Paper ___ collected here.', 'is', 'has', 'does'), ('The bins were ___ last year.', 'installed', 'install', 'installing'), ('Which is passive?', 'The water is cleaned.', 'The staff clean water.', 'Water cleans the staff.')]),
 ('情态动词与可能性', 'may/might/could 表可能，不代表已证实；must 可表示有依据的强推测，不能从广告中的 may 自动推导保证。情态动词后用原形。', ['This change might help.', 'The result may differ.', 'We cannot guarantee success.'], [('The result might ___ different.', 'be', 'is', 'was'), ('“May improve” means ___.', 'Improvement is possible.', 'Improvement is guaranteed.', 'Improvement is impossible.'), ('This change could ___ time.', 'save', 'saves', 'saved')]),
 ('不定式与动名词', 'want/decide/plan 后常接 to do；enjoy/avoid 后接 doing。介词后通常接 doing。记整个搭配而非只背中文含义。', ['They decided to travel by train.', 'I enjoy visiting museums.', 'We can learn by asking questions.'], [('We decided ___ early.', 'to leave', 'leaving', 'leave to'), ('They enjoy ___ local food.', 'trying', 'to trying', 'try'), ('We learn by ___ questions.', 'asking', 'to ask', 'asked')]),
 ('主题句、例证与限定', '段落先给可讨论的观点，再给相关例证。for example 后的例子必须支持观点。some/many/in this study 等限定语有助于避免把有限信息夸大成所有人的情况。', ['Some students prefer printed notes.', 'For example, they can annotate a page.', 'This does not prove that all students prefer paper.'], [('Which phrase avoids an unsupported universal claim?', 'Some students', 'Every student always', 'Nobody ever'), ('Which connector introduces an example?', 'For example', 'Despite', 'Unless'), ('A paragraph’s evidence should ___ its main claim.', 'support', 'ignore', 'replace without explanation')]),
 ('复合句与全文结构', '段落围绕一个中心点。用 although/while 对比，用 because 解释；主句与从句都需要清楚的主谓结构。结论总结已有论点，不突然加入未经解释的新主张。', ['Although the tool is useful, it has limits.', 'While some students prefer audio, others prefer text.', 'The evidence supports a cautious conclusion.'], [('Which sentence is complete?', 'Although it is useful, it has limits.', 'Although it useful.', 'Because of it helps.'), ('A conclusion should usually ___.', 'summarise established points', 'introduce unrelated claims', 'repeat only the title'), ('“While” in the example mainly signals ___.', 'contrast', 'a date', 'a measurement')]),
]

READING_JUDGMENTS = [
 ('Lin studies art.', 'False', 'Lin 的专业是 history；art 是 Mei 的专业。注意人物对应。'),
 ('Bo walks to university.', 'True', '原文“He usually walks to university.”直接支持。'),
 ('Sara’s parents live in the same city as the writer.', 'False', '原文明确说“Her parents live in another city”。'),
 ('There is a cafe on campus.', 'False', '原文“There is no cafe on campus”明确反驳。'),
 ('Lena buys oranges.', 'False', '售货者询问 oranges，Lena says no，不能把询问当购买。'),
 ('Omar cannot swim at the start of the story.', 'True', '原文“he cannot swim”；后面学习游泳不等于一开始会。'),
 ('Jia’s umbrella was expensive.', 'Not Given', '原文仅说丢失并找回伞，没有价格。'),
 ('Nora returned the bike because it began to rain.', 'True', '原文“rain started, so she returned the bike early”。'),
 ('Eva and Tom have already booked an exam.', 'False', '原文“Neither wants to book an exam yet”。'),
 ('Room B has free internet.', 'True', '原文“Both rooms have free internet”，包括 B。'),
 ('Ben bought a new supplement this week.', 'False', '原文是记录睡眠时间 rather than buying a new supplement。'),
 ('Yun knows exactly one hundred English words.', 'Not Given', '没有测量或说明词汇总量。'),
 ('The two lists were identical.', 'False', '原文“The lists were different”，与 identical 相反。'),
 ('Rui has accepted a permanent museum job.', 'False', '原文明确 Before applying，仍在申请前了解工作阶段。'),
 ('The district has proved that total traffic fell.', 'False', '明确“has not measured whether total traffic has fallen”。'),
 ('The tool automatically shares notes between devices.', 'False', '原文“It does not automatically share notes between devices”。'),
 ('The friends allowed asynchronous recordings.', 'True', '原文“They also allowed asynchronous recordings”。'),
 ('Every new visitor will definitely return.', 'Not Given', '组织者不知道是否回访，不能用第一次出席预测未来。'),
 ('The cafe measured the health of its customers.', 'False', '原文“it did not measure anyone’s health”。'),
 ('The collected rainwater is used for drinking.', 'False', '原文“not for drinking”。'),
 ('Chen chose the lamp with the highest price.', 'False', '原文“She chose a cheaper lamp”，并非最贵。'),
 ('All shop owners support the visitor limit.', 'Not Given', '部分店主担心收入，不等于明确支持或反对限制；原文未说明所有店主立场。'),
 ('The survey represents every student in the country.', 'False', '原文“The survey did not represent all students”。'),
 ('Repeated tasks and first attempts were recorded separately.', 'True', '原文明确 separated first attempts from repeated tasks。'),
 ('Electricity is included in the rent.', 'False', 'electricity is billed separately；包含的是 Internet access。'),
 ('The weekly training hours stayed the same.', 'True', '原文“total weekly training hours remained the same”。'),
 ('The hub’s garden is behind the building.', 'True', '段落 B 明确“The garden is behind the building”。'),
 ('A trial class guarantees a later place.', 'False', '原文“does not guarantee a place in later sessions”。'),
 ('The task workshop had higher factual quiz scores.', 'False', '原文测验成绩 similar，而非 higher。'),
 ('The table explains why equipment preferences changed.', 'False', '原文“The figures alone do not explain why preferences changed”。'),
 ('The diagram provides the exact drying temperature.', 'Not Given', '原文没有给具体温度，且提醒不要补充未提供的温度。'),
 ('Price was the only barrier to attendance.', 'False', '原文有 work schedules and transport，“price is only one part”。'),
 ('The workshop issued an IELTS band score.', 'False', '明确“The workshop did not issue an IELTS band score”。'),
 ('The shorter guide was always clearer.', 'False', '短版本去掉了重要 warning，原文说明 not automatically clearer。'),
 ('Every recycling site was inspected.', 'False', '报告不包括 uninspected sites，只报告样本。'),
 ('Students had to accept every automated suggestion.', 'False', '记录接受或拒绝原因；feedback 是 proposal，不是全接收指令。'),
 ('Passenger growth was caused only by the bus lane.', 'Not Given', '票价也变化，不能分离 lane 的唯一因果影响；未证明唯一原因。'),
 ('Only afternoon concerts were kept for next year.', 'False', '原文“kept both formats”。'),
 ('All patients preferred text messages.', 'False', '原文“Some patients preferred phone calls”。'),
 ('The advertised price applied permanently.', 'False', '原文只适用 first month，之后更高。'),
 ('The research covered the entire country.', 'False', '样本 only two neighbourhoods，报告 local association。'),
 ('Every reserved visitor actually attended.', 'False', '原文“Some reserved places went unused”。'),
 ('Technical interruptions were recorded as language errors.', 'False', '原文“recorded technical interruptions separately from language errors”。'),
 ('A short exercise alone proves complete examination readiness.', 'False', '最后一句明确 cannot by itself demonstrate readiness。'),
 ('The institution required an overall score only.', 'False', '原文 required both overall 和 minimum component scores。'),
 ('The learner examined all three recent sessions.', 'True', '原文比较 three unseen practice sessions，未只取最好一次。'),
 ('Both tutors agreed that the conclusion had an unsupported claim.', 'True', '原文“Both agreed...”直接支持。'),
 ('Both friends chose the same next step.', 'False', '原文“They chose different next steps”。'),
]

SCENARIOS += [
('学习与教育',
 'In a small study group, students tried two ways of reviewing vocabulary. In the first week, they reread a list. In the second, they covered the meanings and tried to recall them. Most members preferred the second activity because it showed what they had forgotten. However, the group did not run a controlled experiment. The lists were different, and the students had more practice by week two. Their experience suggests a method worth trying, but it cannot prove that one method always works better for everyone.',
 'Tutor: What did you change this week? Student: I closed my notes before answering. Tutor: How often did you review? Student: On Monday, Wednesday and Saturday. Tutor: Did you learn more new words? Student: No, I reduced the number from ten to five a day. Tutor: Why? Student: My old words were taking too long. Tutor: Keep the review manageable, and record what you can recall without help.',
 [('Why did members prefer recalling?', 'showed what they had forgotten', 'required no effort', 'used more apps'), ('What differed between the weeks?', 'The lists were different', 'the classroom disappeared', 'the students changed schools'), ('What does the experience suggest?', 'a method worth trying', 'a universal guarantee', 'no useful lesson')],
 [('Which days did the student review?', 'Monday, Wednesday and Saturday', 'Tuesday and Friday', 'Sunday only'), ('How many new words per day now?', 'five', 'ten', 'twenty'), ('What was taking too long?', 'My old words', 'the bus journey', 'the writing test')]),
('工作与职业',
 'Rui usually works in a university office, where he answers emails and arranges meetings. This month he is helping a local museum prepare an exhibition. He is interviewing volunteers and checking captions. He enjoys explaining ideas clearly, but he does not enjoy working alone all day. Before applying for a permanent museum job, he wants to speak to staff about their ordinary routine. A short placement can reveal what work feels like, although it cannot show every busy season or long-term responsibility.',
 'Manager: What are you working on today? Rui: I am checking the captions. Manager: The volunteer interviews were planned for Thursday. Are they still then? Rui: We moved them to Friday because the room is unavailable. Manager: How many volunteers will attend? Rui: Eight. Manager: Please finish the captions by Wednesday. Rui: Certainly. I usually need two hours for one display, but this one is larger.',
 [('Where does Rui usually work?', 'a university office', 'a hospital', 'a restaurant'), ('What is he helping prepare?', 'an exhibition', 'a sports event', 'a sales report'), ('What does he want before applying?', 'speak to staff', 'buy equipment', 'move abroad')],
 [('When will interviews actually take place?', 'Friday', 'Thursday', 'Wednesday'), ('How many volunteers will attend?', 'Eight', 'Eighteen', 'Six'), ('When must captions be finished?', 'Wednesday', 'Friday', 'Monday')]),
('城市与环境',
 'Since 2021, a district has added three small parks to former car parks. Residents now have more places to sit, and local children use the paths after school. However, the district has not measured whether total traffic has fallen. Some drivers park in neighbouring streets. A residents’ group welcomes the trees but asks for a transport review as well. Turning a car park into a garden can improve one space while moving another problem elsewhere. The next survey will include streets outside the district boundary.',
 'Planner: Have you visited the new garden? Resident: Yes. I have lived here for six years. Planner: What has changed? Resident: There are more seats, but cars now park near my building. Planner: Our survey first covered only the central square. Resident: Could you include the side streets? Planner: Yes, the next survey will include them in May. Resident: Please ask people who do not drive too.',
 [('How many parks have been added?', 'three small parks', 'six large parks', 'one national park'), ('What has not been measured?', 'whether total traffic has fallen', 'the number of new parks', 'the existence of trees'), ('Where will the next survey also look?', 'outside the district boundary', 'only inside the garden', 'only at the school')],
 [('How long has the resident lived there?', 'six years', 'six months', 'ten years'), ('What did the first survey cover?', 'the central square', 'all side streets', 'the whole city'), ('When is the next survey?', 'May', 'March', 'December')]),
('科技与生活',
 'A student team designed a note-taking tool that works without an internet connection. It stores text on the user’s device and lets users export a file. The team chose this design for learners who study on crowded trains with poor reception. It does not automatically share notes between devices. Some testers liked the privacy; others wanted easier backup. The designers are now adding an optional encrypted backup. A feature that helps one group may create extra work for another, so the team collects feedback before changing the default settings.',
 'Tester: Can I use the tool offline? Designer: Yes, text stays on your device. Tester: Does it upload everything automatically? Designer: No. Backup is optional. Tester: What happens if I lose my phone? Designer: Without an exported file or backup, you may lose the notes. Tester: Then I will export a file every Sunday. Designer: Good. We are also testing a reminder, but it is not released yet.',
 [('Why was offline access chosen?', 'poor reception', 'expensive paper', 'larger screens'), ('What is not automatic?', 'share notes between devices', 'store text', 'open a note'), ('What backup is being added?', 'optional encrypted backup', 'compulsory public backup', 'no backup at all')],
 [('Where does text stay?', 'on your device', 'on a public website', 'in an email inbox'), ('When will the tester export files?', 'every Sunday', 'every hour', 'once a year'), ('What feature is not released yet?', 'a reminder', 'text storage', 'file export')]),
('人与关系',
 'Two friends studied together for a month. At first, one corrected every sentence while the other was speaking. The interruptions made their conversations slow and uncomfortable. They agreed to wait until each short answer ended and then discuss only two useful changes. This arrangement gave both speakers more time to express ideas. They also allowed asynchronous recordings when their schedules differed. The friends still offered honest feedback, but they stopped comparing streaks. Their partnership became easier to maintain because the routine allowed ordinary mistakes and occasional missed days.',
 'Mina: I missed our call yesterday. Leo: Would a voice message work when you are busy? Mina: Yes. Can we keep the live call at eight on most days? Leo: That suits me. Mina: Please let me finish before correcting me. Leo: Of course. Shall we choose one meaning problem and one language problem afterwards? Mina: Good. I will do the same for you.',
 [('What initially caused discomfort?', 'The interruptions', 'the shared schedule', 'short answers'), ('How many changes did they discuss afterwards?', 'two useful changes', 'every possible error', 'twenty changes'), ('What did they stop comparing?', 'streaks', 'study topics', 'recordings')],
 [('What alternative is suggested on busy days?', 'a voice message', 'cancel all practice', 'copy an old recording'), ('What time suits the live call?', 'eight', 'six', 'ten'), ('When should corrections happen?', 'afterwards', 'before every word', 'while Mina is speaking')]),
('文化与娱乐',
 'A neighbourhood cinema has shown older films every Wednesday for five years. Last month, it invited residents to introduce a film they remembered from childhood. One speaker described the audience’s reaction rather than retelling the whole plot. Another explained how the music reflected the period. The event attracted forty people, including some who had never attended before. The organisers do not know whether these visitors will return. They will compare attendance over the next three months before deciding whether to run the event regularly.',
 'Host: Have you seen this film before? Guest: Yes, I first saw it in 2014. Host: What do you remember most? Guest: The music, rather than the ending. Host: Did you watch it at home? Guest: No, at a small cinema with my sister. Host: What will you talk about tonight? Guest: How the music changes the mood. I will play a short excerpt with permission.',
 [('How often are older films shown?', 'every Wednesday', 'every Monday', 'once a year'), ('How many attended the special event?', 'forty people', 'fourteen people', 'four hundred people'), ('How long will attendance be compared?', 'three months', 'five years', 'one evening')],
 [('When did the guest first see the film?', '2014', '2004', '2024'), ('What does the guest remember most?', 'The music', 'the ending', 'the ticket price'), ('Who went with the guest?', 'my sister', 'my brother', 'my teacher')]),
('饮食与公共健康',
 'A university cafe tried a new menu for four weeks. It placed a vegetable option at the top of the board and kept prices unchanged. Sales of that option increased, but the cafe also had more customers during the trial. The manager therefore recorded the share of all meals sold, not only the number of vegetable meals. Students asked for clear ingredient labels because some had allergies. The trial was about menu design and purchasing choices; it did not measure anyone’s health. A change in sales is not evidence of a medical benefit.',
 'Student: If I choose the vegetable dish, is it dairy-free? Server: Not today; the sauce contains milk. Student: Is there another option? Server: The bean soup has no dairy ingredients, but our kitchen handles milk. Student: Thank you for explaining. How much is it? Server: Four pounds. Student: I will ask the manager about my allergy before ordering.',
 [('How long did the menu trial run?', 'four weeks', 'four days', 'one year'), ('What stayed unchanged?', 'prices', 'customer numbers', 'all ingredients'), ('What did the trial not measure?', 'anyone’s health', 'meal sales', 'the menu order')],
 [('What contains milk?', 'the sauce', 'the water', 'the plain bread'), ('Which alternative is mentioned?', 'bean soup', 'chicken soup', 'fruit cake'), ('What is the soup price?', 'Four pounds', 'Five pounds', 'Two pounds')]),
('自然与资源',
 'Rainwater is collected from the roof of a community centre and stored in a covered tank. It is used to water the garden, not for drinking. A filter catches leaves before the water enters the tank. The system was installed by a local contractor last spring. Volunteers check it weekly and remove leaves when necessary. During a dry month, the tank may become empty, so ordinary water is still needed. The centre publishes water-use records instead of claiming that the system eliminates all water demand.',
 'Volunteer: Where is the rainwater stored? Manager: In the covered tank behind the hall. Volunteer: Is it drinking water? Manager: No, it is only for the garden. Volunteer: How often should I check the filter? Manager: Every week, and after a storm. Volunteer: Who installed it? Manager: A local contractor last spring. Volunteer: I will write each check in the log.',
 [('Where is rainwater collected from?', 'the roof', 'a river', 'a well'), ('What is it used for?', 'water the garden', 'drinking', 'washing dishes'), ('What does the filter catch?', 'leaves', 'all dissolved chemicals', 'sunlight')],
 [('Where is the tank?', 'behind the hall', 'under the road', 'inside the office'), ('How often are routine checks required?', 'Every week', 'Every year', 'Every hour'), ('Who installed the system?', 'A local contractor', 'the volunteer alone', 'a school class')]),
('消费与广告',
 'An advertisement said a lamp might help users concentrate. It showed a student smiling beside a desk but gave no details of a study. Chen compared the claim with the product specification. The lamp had adjustable brightness and a one-year warranty. These were checkable features; improved concentration was only a possible outcome. Chen also checked the return policy and the total price including delivery. She chose a cheaper lamp with similar brightness settings. An attractive story can draw attention, but a purchase decision needs information that can be verified.',
 'Shop assistant: This lamp may improve your focus. Chen: Has that been tested? Assistant: I do not have study details. Chen: What can you confirm? Assistant: Three brightness settings and a one-year warranty. Chen: Does the twenty-pound price include delivery? Assistant: No, delivery is five pounds. Chen: What is the return period? Assistant: Fourteen days, under the stated conditions.',
 [('What wording did the advertisement use?', 'might help', 'will cure', 'always guarantees'), ('How long is the warranty?', 'one-year', 'five-year', 'one-month'), ('What did Chen choose?', 'a cheaper lamp', 'the most expensive lamp', 'no lamp because all lamps are unsafe')],
 [('How many brightness settings are confirmed?', 'Three', 'Two', 'Ten'), ('How much is delivery?', 'five pounds', 'twenty pounds', 'free'), ('What is the return period?', 'Fourteen days', 'Forty days', 'Three days')]),
('旅游与社会',
 'A village began limiting group visits to its old harbour. Tour operators now reserve time slots, and each group has at most twenty people. Local residents support quieter mornings, but some shop owners worry about lower sales. The village wants to avoid treating visitor numbers as the only measure of success. It plans to record crowding, resident feedback and business revenue. Visitors are encouraged to use the local bus rather than park beside the harbour. These measures may spread demand, but their effects still need to be observed across a full season.',
 'Guide: We planned to meet at the harbour, but the group meeting point has changed. Please meet at the bus stop at nine twenty. Visitor: How large is the group? Guide: Eighteen people today; the limit is twenty. Visitor: Can I drive to the harbour? Guide: Please use the local bus. It leaves at nine thirty. Visitor: Is lunch included? Guide: No, only the walking tour is included.',
 [('What is the maximum group size?', 'twenty people', 'fifty people', 'ten people'), ('Who worries about lower sales?', 'some shop owners', 'all visitors', 'the bus driver'), ('What transport is encouraged?', 'the local bus', 'private helicopters', 'cars beside the harbour')],
 [('Where is the revised meeting point?', 'the bus stop', 'the harbour', 'the hotel'), ('How many visitors are in today’s group?', 'Eighteen', 'Twenty', 'Eight'), ('When does the bus leave?', 'nine thirty', 'nine twenty', 'ten thirty')]),
('信息与新闻',
 'A headline claimed that students had abandoned printed books. The article described a survey of eighty volunteers from one technology club. Most used digital notes, but several still read printed novels. The survey did not represent all students, and its questions focused on study notes rather than every kind of reading. A reader should compare the headline with the actual sample and question. The club’s results may be useful for choosing its own workshop materials, but applying them to an entire country would require broader evidence.',
 'Editor: The headline says all students prefer screens. Reporter: Our survey only involved the technology club. Editor: How many people answered? Reporter: Eighty volunteers. Editor: Did you ask about novels? Reporter: No, mainly study notes. Editor: Then revise the headline to describe that limited result. Reporter: I will also include how participants were recruited and the date of the survey.',
 [('How many volunteers were surveyed?', 'eighty volunteers', 'eight hundred students', 'the whole country'), ('What did the questions focus on?', 'study notes', 'all novels', 'every media habit'), ('What is needed for a country-wide claim?', 'broader evidence', 'a larger headline', 'one more quotation')],
 [('Which group supplied respondents?', 'the technology club', 'all city schools', 'a national sample'), ('What topic was not directly asked about?', 'novels', 'study notes', 'digital notes'), ('What extra detail will the reporter include?', 'how participants were recruited', 'private passwords', 'every participant’s home address')]),
('综合能力检查',
 'A learning group completed a twelve-week project and reviewed both its work and its methods. Members had written short articles, recorded discussions and answered questions on unfamiliar texts. Their review separated first attempts from repeated tasks. Correct answers on a familiar text showed successful review, but they did not measure performance on new material. Each member selected one weakness and a realistic next step. One planned to practise listening to numbers; another wanted clearer paragraph structure. They kept their shared speaking session while choosing different individual tasks.',
 'Coach: Which result is from a new text? Learner: Tuesday’s reading. I had not seen it before. Coach: And Thursday’s result? Learner: That was a repeat after correction. Coach: Record those separately. Learner: My main weakness is listening to numbers. Coach: Choose a short focused task for next week. Learner: My partner will work on paragraphs, but we will still talk together daily.',
 [('What did the review separate?', 'first attempts from repeated tasks', 'friends by age', 'paper from pens'), ('What does a repeat task demonstrate?', 'successful review', 'new-material performance', 'an official score'), ('What did each member select?', 'one weakness', 'ten new apps', 'a fixed exam date')],
 [('Which reading was unseen?', 'Tuesday', 'Thursday', 'Sunday'), ('What is the learner’s weakness?', 'listening to numbers', 'drawing maps', 'writing names'), ('What will the partner work on?', 'paragraphs', 'numbers only', 'singing')]),
]

SCENARIOS += [
('雅思入门与填空',
 'The Willow Housing Office publishes a guide for new residents. Application forms are available online, but identification must be checked in person. Students can book a fifteen-minute appointment on weekdays. The deposit is sixty pounds and is returned if the key is handed back and the room passes inspection. Internet access is included in rent; electricity is billed separately. The guide asks residents to report repairs through the office rather than directly contacting contractors. It also warns that prices in old brochures may no longer apply. Applicants should confirm the current terms before paying.',
 'Officer: Welcome to Willow Housing. Can I have your surname? Student: Lane, L-A-N-E. Officer: Your appointment is Tuesday at ten forty. Student: I thought it was ten fifteen. Officer: That was the earlier slot; yours is ten forty. Student: How much is the deposit? Officer: Sixty pounds. Bring identification and a printed application. The office is in room twelve, beside the lift.',
 [('选择式填空：Identification must be checked ___.', 'in person', 'by phone', 'by another student'), ('选择式填空：The deposit is ___ pounds.', 'sixty', 'sixteen', 'ninety'), ('Which utility is billed separately?', 'electricity', 'Internet access', 'water and internet together')],
 [('选择式拼写填空：The surname is ___.', 'Lane', 'Laine', 'Lain'), ('What is the confirmed appointment time?', 'ten forty', 'ten fifteen', 'twelve forty'), ('Which room is the office in?', 'room twelve', 'room twenty', 'room two')]),
('阅读判断与定位',
 'A company tested a four-day training timetable with thirty new employees. Their total weekly training hours remained the same, but sessions were longer each day. Attendance improved compared with the previous intake. However, the two groups joined in different seasons, and the company had changed its transport subsidy. The report does not claim that the timetable alone caused the improvement. Participants liked having a free weekday for personal tasks, although some found the longer sessions tiring. The company will try shorter sessions before extending the scheme. No information about employee salaries was included in the report.',
 'Trainer: The old course used five days. This trial uses four, but the total hours are unchanged. Employee: Are the sessions shorter? Trainer: They are longer, so we are adding breaks. Employee: How many employees are in the trial? Trainer: Thirty. Employee: When will you review it? Trainer: In July. Employee: Will salaries change? Trainer: This briefing does not cover pay; please ask human resources.',
 [('The timetable caused attendance to improve: which phrase prevents this conclusion?', 'does not claim', 'Attendance improved', 'thirty new employees'), ('选择式判断：Weekly training hours were reduced. 原文证据是什么？', 'remained the same', 'four-day', 'different seasons'), ('What will be tried before expansion?', 'shorter sessions', 'higher salaries', 'longer journeys')],
 [('How many days does the trial use?', 'four', 'five', 'three'), ('How many employees take part?', 'Thirty', 'Thirteen', 'Forty'), ('When is the review?', 'July', 'January', 'June')]),
('听力地图与阅读标题',
 'Paragraph A: A town converted an old railway station into a community hub. Its location beside the bus stop made it accessible without a car. Paragraph B: The main entrance now faces the square. A quiet room lies to the left of reception, while a workshop is on the right. The garden is behind the building. Paragraph C: Opening hours were extended after residents requested evening access. Attendance rose, but the town has not yet compared operating costs with similar centres. The project’s next report will examine cost as well as use.',
 'Guide: Start at the entrance facing the square. Reception is straight ahead. Turn left for the quiet room; the workshop is on the right. To reach the garden, go past reception and through the back door. The cafe was planned for the room beside the entrance, but that room is now storage. The cafe is upstairs. Please use the lift if you need step-free access.',
 [('段落匹配：Which paragraph discusses the building’s internal arrangement?', 'Paragraph B', 'Paragraph A', 'Paragraph C'), ('段落匹配：Which paragraph explains convenient access?', 'Paragraph A', 'Paragraph B', 'Paragraph C'), ('What will the next report examine?', 'cost as well as use', 'only paint colours', 'national rail fares')],
 [('From reception, where is the quiet room?', 'left', 'right', 'upstairs'), ('Where is the garden?', 'through the back door', 'beside the entrance', 'upstairs'), ('Where is the cafe now?', 'upstairs', 'beside the entrance', 'in the garden')]),
('听力选择与信息匹配',
 'The Riverside Sports Centre offers three classes. Class A introduces badminton and supplies rackets, so learners only bring suitable shoes. Class B teaches basic swimming and requires participants to bring a towel. Class C is an outdoor walking group that meets at the centre before travelling to local paths. It does not meet when a weather warning is issued. All classes welcome beginners, but the pool group has limited places and requires advance booking. Members can attend one trial class before buying a monthly pass. Trial attendance does not guarantee a place in later sessions.',
 'Receptionist: You asked about the evening badminton class. Visitor: Yes, is it on Wednesday? Receptionist: It used to be. It is now on Thursday at six thirty. Visitor: Do I need to buy a racket? Receptionist: No, we supply rackets. Visitor: What is the trial price? Receptionist: Five pounds, not the monthly fee of twenty. Visitor: Can my friend join? Receptionist: Only if there is a place; please book separately.',
 [('信息匹配：Which class supplies rackets?', 'Class A', 'Class B', 'Class C'), ('信息匹配：Which class requires a towel?', 'Class B', 'Class A', 'Class C'), ('What does trial attendance not guarantee?', 'a place in later sessions', 'access to the trial', 'a chance to meet staff')],
 [('What is the current class day?', 'Thursday', 'Wednesday', 'Tuesday'), ('What time does it start?', 'six thirty', 'six fifteen', 'seven thirty'), ('What is the trial price?', 'Five pounds', 'twenty pounds', 'fifteen pounds')]),
('学术听力与摘要填空',
 'A teaching team compared two introductory geography workshops. One used a lecture with slides; the other combined short explanations with map tasks. Students in the task workshop reported higher engagement. Their factual quiz scores were similar to those of the lecture group, however. The team cautioned that enjoyment and learning are related but distinct outcomes. Attendance was voluntary, which may have attracted students already interested in maps. A future comparison will allocate students randomly and include a delayed quiz. That design could give stronger evidence about retention, rather than relying only on immediate reactions.',
 'Lecturer: Today we distinguish engagement from retention. In our trial, the map-task group reported greater engagement, but immediate quiz scores were similar. There were forty students in each group. Participation was voluntary, so selection could affect the findings. Next term we will allocate students randomly. A second quiz will take place two weeks later. Please note the delay: two weeks, not two days. That quiz will test what students retain.',
 [('摘要填空：Students reported higher ___ in the task workshop.', 'engagement', 'attendance fees', 'salaries'), ('Which quiz result was similar?', 'factual quiz scores', 'all long-term outcomes', 'no quiz result'), ('How will students be allocated in the future?', 'randomly', 'by favourite map', 'by height')],
 [('How many students were in each group?', 'forty', 'fourteen', 'eighty'), ('What was the participation method?', 'voluntary', 'compulsory', 'random allocation already'), ('When will the second quiz be held?', 'two weeks later', 'two days', 'two months later')]),
('Task 1 图表与比较',
 'A fictional college recorded the number of students borrowing three kinds of equipment. In 2020, laptops had 120 users, cameras 80 and audio recorders 40. In 2024, the figures were 180, 60 and 90 respectively. Laptops remained the most frequently borrowed category. Recorder users more than doubled, while camera users declined. These counts describe users, not the total number of devices or loan transactions. A clear summary should identify the broad pattern before listing selected comparisons. The figures alone do not explain why preferences changed; any explanation would need separate evidence.',
 'Tutor: Your chart overview says all categories increased. Check the camera figures. Student: They fell from eighty to sixty. Tutor: Good. Which category remained highest? Student: Laptops. Tutor: And which more than doubled? Student: Audio recorders, from forty to ninety. Tutor: Use those broad patterns in the overview. Do not explain the changes by saying students became richer; the chart contains no income data.',
 [('Which category remained highest?', 'Laptops', 'cameras', 'audio recorders'), ('What happened to camera users?', 'declined', 'more than doubled', 'remained unchanged'), ('What do the figures count?', 'users', 'loan transactions', 'devices owned')],
 [('How many camera users were there in 2024?', 'sixty', 'eighty', 'ninety'), ('Which category more than doubled?', 'Audio recorders', 'Laptops', 'Cameras'), ('What kind of data is absent?', 'income data', 'equipment categories', 'user counts')]),
('Task 1 流程地图与 Task 2',
 'In a fictional paper-recycling facility, used paper is first collected and sorted. Plastic covers are removed before the paper is mixed with water. The mixture is then cleaned to remove unwanted material. Next, it passes through rollers that press out excess water. Finally, the sheets are dried and cut. A process description should show this sequence clearly and use the passive voice when the operator is unimportant. It should not add temperatures or machine names that are not provided. An environmental discussion can evaluate recycling separately, but that opinion does not belong in a factual process summary.',
 'Engineer: We collect and sort the paper first. Visitor: Is it dried immediately? Engineer: No. It is mixed with water after plastic covers are removed. The mixture is cleaned before it reaches the rollers. Visitor: What do the rollers do? Engineer: Press out excess water. The sheets are then dried and cut. Visitor: Is there a temperature in this diagram? Engineer: No; do not invent one.',
 [('What happens before paper is mixed with water?', 'Plastic covers are removed', 'the final sheets are sold', 'new trees are planted'), ('What do rollers remove?', 'excess water', 'all labels before collection', 'printing demand'), ('What should not be added?', 'temperatures or machine names', 'the sequence', 'the passive voice')],
 [('What is done first?', 'collect and sort', 'dry and cut', 'press and sell'), ('When is the mixture cleaned?', 'before it reaches the rollers', 'after it is cut', 'before paper is collected'), ('What comes after drying?', 'cut', 'collect', 'mix with water')]),
('Task 2 主要题型整合',
 'A city debated whether to fund a free exercise programme. Supporters argued that fees can prevent some residents from participating. Critics asked whether a free programme would reach people with the greatest need or mainly those who already exercise. A trial offered sessions in two neighbourhoods at different times. Attendance was recorded, but organisers also asked why people did not attend. Work schedules and transport were common barriers. The debate showed that price is only one part of access. An essay can support public funding while explaining how scheduling and evaluation would make the policy more effective.',
 'Researcher: We expected cost to be the main barrier. Interviewer: Was it? Researcher: For some people, yes. But many mentioned work schedules and transport. Interviewer: How many neighbourhoods joined the trial? Researcher: Two. Interviewer: Did high attendance prove improved health? Researcher: No, we measured attendance only. Interviewer: What should the next report include? Researcher: Participation barriers and a clearly defined evaluation plan.',
 [('What could fees prevent?', 'participating', 'transport from existing', 'all employment'), ('How many neighbourhoods hosted the trial?', 'two neighbourhoods', 'twenty neighbourhoods', 'the entire country'), ('What were common barriers?', 'Work schedules and transport', 'weather alone', 'free sessions themselves')],
 [('What was expected to be the main barrier?', 'cost', 'language', 'age'), ('What outcome was actually measured?', 'attendance only', 'improved health', 'employment growth'), ('What should a future report include?', 'Participation barriers', 'private medical diagnoses', 'only advertising slogans')]),
]

SCENARIOS += [
('首次分科模拟 X3 · 原创辅助课',
 'A library offered an academic-reading workshop in which learners timed a short first attempt and then examined their errors. The instructor separated vocabulary problems from failures to locate evidence. Some students knew every word in a question but selected a statement that was merely plausible. Others found the relevant sentence yet missed a contrast word. The class recorded both the answer and the evidence sentence. On a new passage the following week, students checked whether the same error patterns returned. Faster work was useful only if understanding was maintained. The workshop did not issue an IELTS band score.',
 'Instructor: You finished quickly, but let us examine question three. Learner: I chose it because it sounded reasonable. Instructor: Which sentence supports it? Learner: I cannot find one. Instructor: Record that as an evidence-location problem, not a spelling error. Learner: Should I redo this passage tomorrow? Instructor: Yes, for review. Use an unseen passage next week to check transfer. Keep those two results separate.',
 [('What did the instructor separate?', 'vocabulary problems from failures to locate evidence', 'students by gender', 'books by colour'), ('What was recorded alongside each answer?', 'the evidence sentence', 'only the time', 'a predicted band'), ('What did the workshop not issue?', 'an IELTS band score', 'practice questions', 'feedback')],
 [('What kind of error is discussed?', 'an evidence-location problem', 'a spelling error', 'a microphone failure'), ('When is an unseen passage recommended?', 'next week', 'tomorrow for the same text', 'never'), ('Why redo the same passage?', 'for review', 'to obtain an official score', 'to replace all new tasks')]),
('修复 X3 短板 · 工作主题',
 'A workplace training report compared how staff described a new booking system. Beginners often listed buttons without explaining the order of actions. Experienced users were more likely to begin with the purpose of a task and then describe the steps. The trainer revised the guide to follow that sequence. However, a shorter guide was not automatically clearer: one version removed an important warning about duplicate bookings. The final guide kept the warning and used a concrete example. Clear communication depends on relevant structure and sufficient information, rather than on sentence length alone.',
 'Trainer: Your paragraph lists four buttons. What is the user trying to do? Employee: Book a meeting room. Trainer: Begin with that purpose. Then explain selecting a date and checking availability. Employee: Can I remove the duplicate-booking warning? Trainer: No, it prevents an important mistake. Employee: I will move it beside the confirmation step. Trainer: Good. Ask a new user to try the instructions before publishing them.',
 [('How did experienced users begin?', 'the purpose of a task', 'button colours', 'unrelated anecdotes'), ('What was removed from one shorter version?', 'an important warning', 'every instruction', 'all examples'), ('What did the final guide use?', 'a concrete example', 'only abbreviations', 'a longer title with no steps')],
 [('What is the user trying to book?', 'a meeting room', 'a train ticket', 'a hotel'), ('Where will the warning go?', 'beside the confirmation step', 'in an unrelated appendix', 'nowhere'), ('Who should try the instructions?', 'a new user', 'only the writer', 'nobody')]),
('首次分科模拟 X4 · 环境主题',
 'A council installed separate recycling bins in a market. In the first month, the amount collected rose, but contamination also increased. Inspectors found food in containers intended for dry paper. The council changed the labels and added examples of acceptable items. After the change, contamination fell in the inspected samples. The report did not include uninspected sites or the full cost of sorting. Therefore, the evidence supports a limited claim about the sampled bins, rather than proof that the whole system became cheaper. The next review will track collection quality and costs together.',
 'Officer: We initially counted only the amount collected. Interviewer: What problem did you find? Officer: Food mixed with dry paper. Interviewer: What did you change? Officer: The labels, with pictures of acceptable items. Interviewer: Did you inspect every site? Officer: No, twelve sampled sites. Interviewer: What will the next review measure? Officer: Quality and sorting costs, not only total weight.',
 [('What increased alongside collection?', 'contamination', 'tree planting', 'all household income'), ('What did new labels add?', 'examples of acceptable items', 'private names', 'a guarantee of savings'), ('What was missing from the report?', 'the full cost of sorting', 'the existence of bins', 'the label changes')],
 [('What contaminated the paper?', 'Food', 'clean labels', 'empty air'), ('How many sites were sampled?', 'twelve', 'twenty', 'every site'), ('What additional cost will be measured?', 'sorting costs', 'school fees', 'train fares')]),
('阶段反馈与能力复核 · 科技主题',
 'An automated writing tool highlighted possible language errors in student essays. Tutors found it useful for repeated spelling mistakes, but some suggestions changed the writer’s intended meaning. Students were asked to keep an edit log containing the original sentence, the suggestion and their reason for accepting or rejecting it. The tool did not evaluate evidence quality reliably. A grammatically polished paragraph could still fail to answer the task. Tutors therefore reviewed argument and organisation separately. Feedback was treated as a proposal to examine, not an instruction to accept every change.',
 'Tutor: The tool changed your sentence from a possibility to a certainty. Student: I wrote that the policy may help. Tutor: Keep that caution unless you have stronger evidence. Student: It also corrected two spelling errors. Tutor: Those changes look appropriate. Student: Can its score replace a teacher’s review? Tutor: No. It can help with practice, but a practice estimate is not an official result.',
 [('What did students keep?', 'an edit log', 'only the final score', 'every suggestion without checking'), ('What did the tool struggle to evaluate?', 'evidence quality', 'all spelling', 'word count in every case'), ('How should feedback be treated?', 'a proposal to examine', 'a command to obey', 'an official certificate')],
 [('What meaning change was problematic?', 'a possibility to a certainty', 'a noun to its plural', 'a spelling correction'), ('How many spelling corrections are mentioned?', 'two', 'ten', 'none'), ('What is a practice estimate not?', 'an official result', 'feedback', 'a learning aid')]),
('首次分科模拟 Y3 · 城市生活',
 'A city opened a bus lane on a busy corridor and compared journey times before and after the change. The median bus journey became shorter during the morning peak. Car journey times varied by route, and the report did not claim that every road improved. Passenger numbers rose after fares were reduced in the same period. Because both changes occurred together, the report could not isolate the effect of the lane on passenger demand. A later study will compare similar corridors with different policies. Policy evaluation needs suitable comparisons as well as attractive headline figures.',
 'Analyst: The morning bus median fell from thirty minutes to twenty-four. Presenter: Did every road improve? Analyst: We did not measure every road. Presenter: Why did passenger numbers rise? Analyst: Fares also fell, so we cannot attribute the rise only to the lane. Presenter: What is the next step? Analyst: Compare similar corridors. Presenter: I will avoid a headline saying the lane solved all traffic problems.',
 [('Which journey measure became shorter?', 'median bus journey', 'every car journey', 'every road journey'), ('What changed at the same time?', 'fares were reduced', 'all roads closed', 'passenger numbers were banned'), ('What will a later study compare?', 'similar corridors', 'unrelated countries only', 'bus colours')],
 [('What is the new median bus time?', 'twenty-four', 'thirty', 'forty'), ('Can the demand rise be attributed only to the lane?', 'cannot attribute the rise only to the lane', 'the lane solved all traffic problems', 'fares had no change'), ('What comparison is proposed?', 'similar corridors', 'every city in the world immediately', 'car colours')]),
('修复 Y3 短板 · 文化娱乐',
 'A music festival sold more tickets after introducing discounted afternoon sessions. The organisers also changed the programme and increased advertising, so ticket growth could not be attributed to the discount alone. Audience interviews showed that some visitors valued the shorter sessions because they could attend after work. Others preferred full evening concerts. The organisers kept both formats for the following year. Their report described attendance and preferences but made no claim that one format was artistically superior. The case illustrates why a statement may be unsupported even when it sounds plausible.',
 'Organiser: Total ticket sales rose, but several things changed. Reporter: So the discount was not the only possible cause? Organiser: Correct. We changed the programme and advertising too. Reporter: What did some visitors like? Organiser: Shorter sessions after work. Reporter: Will you remove evening concerts? Organiser: No, both formats will remain next year. Reporter: I will describe preferences rather than claim one format is better art.',
 [('What else changed besides discounting?', 'programme and increased advertising', 'the city’s population alone', 'nothing else'), ('Why did some like shorter sessions?', 'attend after work', 'they disliked all music', 'tickets were always free'), ('What formats were kept?', 'both formats', 'only afternoons', 'only evenings')],
 [('Is the discount the only possible cause?', 'not the only possible cause', 'the only confirmed cause', 'irrelevant because no tickets sold'), ('What will remain next year?', 'both formats', 'only free concerts', 'no concerts'), ('What should the report describe?', 'preferences', 'an unsupported ranking of art', 'a guaranteed future profit')]),
('首次分科模拟 Y4 · 公共健康',
 'A public-health team piloted appointment reminders at two clinics. Patients who opted into reminders missed fewer appointments than the previous year’s average. However, participation was voluntary, and the pilot ran during a quieter season. The team did not conclude that reminders alone caused the change. Some patients preferred phone calls because they had difficulty reading text messages. The next phase will offer both formats and examine access barriers. The report records missed appointments; it does not establish changes in treatment outcomes. Clear distinctions between participation, attendance and health results prevent overstatement.',
 'Coordinator: Our pilot covered two clinics. Interviewer: Were reminders compulsory? Coordinator: No, patients opted in. Interviewer: Did everyone prefer text messages? Coordinator: Some preferred phone calls. Interviewer: Does fewer missed appointments prove better treatment outcomes? Coordinator: Not from this data. Interviewer: What will you examine next? Coordinator: Access barriers and both reminder formats. Please avoid including patient names in the public report.',
 [('How many clinics hosted the pilot?', 'two clinics', 'twenty clinics', 'all clinics nationally'), ('What was the participation method?', 'voluntary', 'compulsory', 'not described'), ('What outcome is not established?', 'treatment outcomes', 'missed appointments', 'the existence of reminders')],
 [('How did patients join?', 'opted in', 'were all forced', 'bought a subscription'), ('What alternative did some prefer?', 'phone calls', 'printed novels', 'video advertisements'), ('What must be excluded from the public report?', 'patient names', 'the clinic count', 'the limitations')]),
('修复 Y4 与人工反馈 · 消费广告',
 'A researcher asked students to review an advertisement for a subscription service. The headline price applied only to the first month. Later months cost more, and cancellation required notice before the renewal date. Several students initially described the service as permanently cheap because they had read only the headline. They revised their summaries after examining the conditions. A strong comparison included the total cost over a common period and the cancellation rules. This approach made the choice clearer without assuming that the cheapest option was suitable for every user.',
 'Student: I described the subscription as five pounds a month. Tutor: Is that the continuing price? Student: No, five is only the first month; later months are twelve. Tutor: What about cancellation? Student: Notice is required before renewal. Tutor: Revise your comparison over three months. Student: That makes twenty-nine pounds, assuming no extra charges. Tutor: State the assumption and compare the same period for both services.',
 [('What did the headline price cover?', 'only to the first month', 'every month forever', 'a full year'), ('What was required before renewal?', 'notice', 'a new device', 'an exam result'), ('How should costs be compared?', 'over a common period', 'only by headline size', 'without cancellation rules')],
 [('What is the later monthly price?', 'twelve', 'five', 'twenty-nine'), ('What period is suggested for comparison?', 'three months', 'one day', 'ten years'), ('What is the stated three-month total?', 'twenty-nine pounds', 'fifteen pounds', 'thirty-six pounds')]),
('新题测量 Z1 · 社会变化',
 'Researchers examined whether remote work changed how residents used local shops. Interviews suggested that some workers bought lunch near home more often. Shop records showed growth in weekday lunchtime sales, but a new housing development opened during the same period. The sample included only two neighbourhoods. The researchers therefore described a local association rather than a national causal trend. They recommended collecting longer records and comparing areas with different housing growth. The study’s value lay partly in identifying what was still unknown, rather than presenting a simple explanation for every change.',
 'Researcher: Our interviews covered two neighbourhoods. Host: Did sales increase? Researcher: Weekday lunchtime sales did. Host: Was remote work the sole cause? Researcher: We cannot establish that; new housing opened too. Host: What do you recommend? Researcher: Longer records and comparison areas. Host: Should the headline say all towns changed? Researcher: No, that would go beyond our sample.',
 [('Which sales grew?', 'weekday lunchtime sales', 'all national sales', 'only midnight sales'), ('What other development occurred?', 'a new housing development', 'all shops closed', 'a national tax was described'), ('What kind of finding was reported?', 'a local association', 'a national causal trend', 'a universal law')],
 [('How many neighbourhoods were interviewed?', 'two', 'twelve', 'twenty'), ('What competing explanation is mentioned?', 'new housing', 'a flood not in the text', 'cheaper train fares'), ('What records are recommended?', 'Longer records', 'only one receipt', 'no further records')]),
('修复 Z1 薄弱题型 · 旅游',
 'A coastal town introduced an online booking system for a popular walking route. Visitors could reserve morning or afternoon entry, but residents retained free access at any time. The council hoped to reduce crowding at a narrow bridge. Initial counts showed fewer people at the bridge at noon, yet afternoon queues at the entrance grew. The first report discussed this redistribution rather than declaring crowding solved. It also separated booked visitors from actual attendance. Some reserved places went unused. A reliable evaluation must track where and when people gather, not merely how many reservations are made.',
 'Council officer: Residents still have free access. Visitor: My booking says morning. Can I enter at three? Officer: You need an afternoon slot. Visitor: Are bookings the same as attendance? Officer: No, some people do not arrive. Visitor: Has crowding disappeared? Officer: Noon counts at the bridge fell, but afternoon entrance queues grew. Visitor: Then the problem may have moved. Officer: That is what we are examining.',
 [('Who retained access at any time?', 'residents', 'every booked visitor', 'only tour operators'), ('Where did afternoon queues grow?', 'at the entrance', 'at every hotel', 'inside the council office'), ('What must be separated?', 'booked visitors from actual attendance', 'morning from daylight permanently', 'residents from all records')],
 [('What slot is needed for entry at three?', 'an afternoon slot', 'a morning slot', 'no slot for all visitors'), ('Why are bookings not attendance?', 'some people do not arrive', 'every booking is cancelled', 'nobody can enter'), ('What fell?', 'Noon counts at the bridge', 'all queues at every time', 'the town population')]),
('完整模拟前准备 · 作答界面',
 'A learner practised using an unfamiliar test interface before a timed session. She checked how to move between questions, mark items for review and enter answers. During practice, she discovered that an unfinished answer remained blank when she changed sections. She also tested the headphones and adjusted the seat before starting. These checks reduced avoidable uncertainty, but they did not replace language preparation. The next session used unseen material under the selected test format’s rules. The learner recorded technical interruptions separately from language errors so that the result could be interpreted fairly.',
 'Invigilator: This is a practice interface, not a scored examination. Learner: Can I check how review marks work? Invigilator: Yes. Also test the headphones before starting. Learner: I hear only one side. Invigilator: We will replace them. Learner: Should I count that delay as reading time? Invigilator: Record it separately for this practice. Once the equipment works, start a fresh timed session with unseen material.',
 [('What happened to an unfinished answer?', 'remained blank', 'was automatically correct', 'was copied from another question'), ('What did the checks reduce?', 'avoidable uncertainty', 'all language errors', 'the official pass mark'), ('How were technical interruptions recorded?', 'separately', 'as vocabulary mistakes', 'not at all')],
 [('What equipment problem is reported?', 'only one side', 'a broken keyboard', 'no chair'), ('What will be replaced?', 'headphones', 'the reading questions', 'the learner’s notes'), ('What material should the fresh session use?', 'unseen material', 'memorised answers', 'the same corrected text only')]),
('连续模拟 Z2 · 注意力与耐力',
 'Two learners completed a continuous practice session after several weeks of separate section work. They found that managing attention across sections was different from doing one short exercise. One rushed the final paragraph; the other spent too long checking early answers. They recorded the time spent in each section and marked where concentration dropped. The review did not treat tiredness as proof of low ability. Instead, they planned another realistic session with appropriate rest beforehand and the same test rules. A short exercise score cannot by itself demonstrate readiness for the complete examination process.',
 'Partner A: I slowed down in the last section. Partner B: I checked the first answers too many times. A: Let us record those patterns before changing the plan. B: Should we repeat every section tonight? A: No, we are tired. Review tomorrow, then schedule a new continuous session. B: With a different paper? A: Yes, keep familiar practice and new measurement separate. B: We should also note our sleep and any interruptions.',
 [('How did the first learner struggle?', 'rushed the final paragraph', 'forgot every word', 'never started'), ('What was recorded for each section?', 'the time spent', 'only a guessed score', 'the colour of the screen'), ('What cannot prove full-process readiness?', 'A short exercise score', 'a realistic session', 'an interruption log')],
 [('When will they review?', 'tomorrow', 'immediately all night', 'never'), ('What kind of paper for the new session?', 'a different paper', 'the same memorised one', 'an answer sheet only'), ('What else should be noted?', 'sleep and any interruptions', 'private account passwords', 'a guaranteed result')]),
('修复 Z2 与报名评估 · 目标核查',
 'A learner averaged strong practice results in reading and listening but had not obtained detailed feedback on speaking or writing. Her friend reminded her that the receiving institution required both an overall score and minimum component scores. They checked the published requirement rather than assuming that an average was sufficient. The learner arranged a qualified review of two independent writing samples and a recorded speaking session. The feedback identified weaknesses in task response and development of ideas. She postponed booking until she had practised those areas and obtained fresh evidence. An administrative deadline also needed to be considered.',
 'Friend: What score does your institution require? Learner: An overall target and minimum scores in each component. Friend: Have you checked the current page? Learner: Yes, but my writing evidence is weak. Friend: Can a reading result compensate automatically? Learner: Not if the writing minimum is unmet. Friend: What will you do? Learner: Get detailed feedback and submit a new independent sample before deciding on booking.',
 [('What requirements must both be checked?', 'overall score and minimum component scores', 'only the highest component', 'only attendance'), ('How many writing samples were reviewed?', 'two independent writing samples', 'one copied essay', 'ten unfinished titles'), ('Why was booking postponed?', 'practised those areas and obtained fresh evidence', 'an official guarantee was already given', 'reading was never practised')],
 [('What evidence is weak?', 'writing evidence', 'the institution’s name', 'device battery data'), ('Can reading automatically compensate for an unmet writing minimum?', 'Not if the writing minimum is unmet', 'always', 'only if a friend agrees'), ('What should a new sample be?', 'independent', 'copied', 'only an outline with no response')]),
('连续模拟 Z3 · 稳定性',
 'A learner compared three unseen practice sessions. The second result was stronger than the first, but the third fell in listening after several number-related mistakes. She did not average away the difficulty. Instead, she examined the recordings and found confusion between thirteen and thirty, plus one answer written in the wrong field. A focused review addressed those patterns, while the next full session used new material. The record included conditions and whether a task was first attempted or repeated. Stability means looking for repeatable performance and understandable errors, not selecting only the most flattering result.',
 'Learner: My best listening result was in session two. Coach: What happened in session three? Learner: I confused thirteen with thirty, and entered one answer in the wrong field. Coach: Record both causes. Learner: Can I use only the best score? Coach: Use the whole recent record. Practise the errors, then check performance on a new session. Learner: I will also record whether I heard each audio once or replayed it.',
 [('In which session did listening fall?', 'the third', 'the first only', 'none'), ('Which numbers caused confusion?', 'thirteen and thirty', 'one and two', 'forty and fifty'), ('What does stability require?', 'repeatable performance', 'only the most flattering result', 'replaying every test until perfect')],
 [('Which session was the best listening result?', 'session two', 'session three', 'session one'), ('What additional error occurred?', 'the wrong field', 'a broken chair', 'a missing essay title'), ('What record should be used?', 'the whole recent record', 'only the best score', 'only repeated tasks')]),
('修复 Z3 与最终复核 · 反馈取舍',
 'Two tutors reviewed the same essay and disagreed about one example. One thought it was sufficiently relevant; the other wanted a clearer link to the question. The learner compared their reasons rather than counting votes. Both agreed that the conclusion introduced a new claim without support. She revised that point first, then added a sentence explaining the example’s relevance. A second review used a fresh essay to see whether she could apply the feedback independently. Differences between practice judgments are possible, so an estimate should be presented with its limits instead of as a guaranteed examination result.',
 'Learner: The tutors disagreed about my example. Partner: Did they give reasons? Learner: Yes. But both said my conclusion added an unsupported claim. Partner: Start with the shared issue. Learner: I will remove that claim and clarify the example. Partner: How will you check the change transfers? Learner: Write a fresh essay without assistance, then request another review. Partner: Keep both drafts so you can explain what changed.',
 [('What did both tutors agree on?', 'a new claim without support', 'every sentence was wrong', 'the essay was an official result'), ('What did the learner add?', 'a sentence explaining the example’s relevance', 'an unrelated anecdote', 'a longer unsupported conclusion'), ('How was independent transfer checked?', 'a fresh essay', 'only proofreading the old title', 'copying a tutor’s paragraph')],
 [('What should be addressed first?', 'the shared issue', 'the number of comments', 'the longest word'), ('How should the fresh essay be written?', 'without assistance', 'with every sentence supplied', 'by copying the old essay'), ('What should be kept?', 'both drafts', 'only a score screenshot', 'nothing')]),
('连续模拟 Z4 与决策 · 后续学习',
 'At the end of a long plan, two friends reviewed their recent evidence and practical constraints. One was close to her required scores and had received detailed feedback on all skills. The other needed more time for listening. They chose different next steps while keeping their shared conversation routine. The first checked the correct exam category and booking conditions; the second planned four focused weeks before another unseen test. Neither treated completion of a calendar as proof of a particular score. A sustainable plan can end with booking, extension or a revised goal, depending on the learner’s evidence and actual requirements.',
 'Friend A: I have completed the plan, but that alone is not a score. Friend B: I agree. I need four more focused weeks for listening. A: I will check my institution’s category and current booking conditions. B: Can we still practise together? A: Yes, our speaking routine can continue even if we take different next steps. B: Let us choose a review date now. A: In four weeks, with new material rather than repeated answers.',
 [('Who needed more time for listening?', 'The other', 'both were explicitly ready', 'neither'), ('What did the first learner check?', 'correct exam category and booking conditions', 'only a calendar', 'a friend’s old price list'), ('What does calendar completion not prove?', 'a particular score', 'that days passed', 'that there is a plan')],
 [('How much extra time does Friend B need?', 'four more focused weeks', 'four days', 'one year exactly'), ('What can continue despite different next steps?', 'our speaking routine', 'the same exam appointment automatically', 'identical individual tasks'), ('What should the review use?', 'new material', 'repeated answers', 'an app streak alone')]),
]

# 词性采用常见词典缩写；例句从本周原创阅读/听力中抽取，便于语境复习。
VOCABULARY = '''
name|姓名|n.;student|学生|n.;major|专业|n.;friend|朋友|n.;library|图书馆|n.;hour|小时|n.;beginner|初学者|n.;slowly|慢慢地|adv.
breakfast|早餐|n.;usually|通常|adv.;walk|步行|v.;noon|中午|n.;dinner|晚餐|n.;review|复习|v.;routine|日常惯例|n.;tonight|今晚|adv.
family|家庭|n.;nurse|护士|n.;cook|厨师|n.;brother|兄弟|n.;near|在附近|prep.;fruit|水果|n.;cousin|堂/表亲|n.;daughter|女儿|n.
campus|校园|n.;gate|大门|n.;behind|在后面|prep.;classroom|教室|n.;above|在上面|prep.;between|在两者之间|prep.;across|在另一边|prep.;straight|直走地|adv.
market|市场|n.;rice|米饭/大米|n.;bottle|瓶子|n.;milk|牛奶|n.;bread|面包|n.;seller|售货者|n.;change|找零|n.;egg|鸡蛋|n.
badminton|羽毛球|n.;swim|游泳|v.;shallow|浅的|adj.;pool|泳池|n.;compete|比赛|v.;skill|技能|n.;racket|球拍|n.;clean|干净的|adj.
museum|博物馆|n.;ticket|票|n.;robot|机器人|n.;weather|天气|n.;umbrella|伞|n.;staff|工作人员|n.;postcard|明信片|n.;underground|地铁|n.
trip|短途旅行|n.;direct|直达的|adj.;station|车站|n.;east|向东|adv.;rent|租用|v.;timetable|时刻表|n.;platform|站台|n.;return|往返的|adj.
practise|练习|v.;plan|计划|n.;progress|进展|n.;difficult|困难的|adj.;repeat|重复|v.;reminder|提醒|n.;question|问题|n.;recording|录音|n.
compare|比较|v.;quiet|安静的|adj.;chair|椅子|n.;window|窗户|n.;prefer|更喜欢|v.;choice|选择|n.;weight|重量|n.;budget|预算|n.
tired|疲惫的|adj.;suggest|建议|v.;bedtime|就寝时间|n.;break|休息|n.;diagnosis|诊断|n.;qualified|有资质的|adj.;supplement|补充剂|n.;professional|专业人士|n.
describe|描述|v.;dictionary|词典|n.;introduction|介绍|n.;partner|搭档|n.;stage|阶段|n.;failure|失败|n.;afterwards|事后|adv.;speech|讲话/语音|n.
vocabulary|词汇|n.;recall|回忆|v.;controlled|受控的|adj.;experiment|实验|n.;suggest|提示/表明|v.;method|方法|n.;reduce|减少|v.;manageable|可管理的|adj.
arrange|安排|v.;exhibition|展览|n.;volunteer|志愿者|n.;caption|图片说明|n.;permanent|长期的|adj.;placement|实习/短期岗位|n.;responsibility|责任|n.;available|可用的|adj.
district|城区|n.;resident|居民|n.;traffic|交通流量|n.;neighbouring|邻近的|adj.;boundary|边界|n.;survey|调查|n.;include|包括|v.;transport|交通运输|n.
device|设备|n.;export|导出|v.;reception|信号接收|n.;privacy|隐私|n.;backup|备份|n.;encrypted|加密的|adj.;optional|可选的|adj.;default|默认的|adj.
interrupt|打断|v.;uncomfortable|不舒服的|adj.;express|表达|v.;asynchronous|异步的|adj.;schedule|日程|n.;honest|诚实的|adj.;maintain|维持|v.;occasional|偶尔的|adj.
cinema|电影院|n.;audience|观众|n.;reaction|反应|n.;plot|情节|n.;period|时期|n.;attendance|出席人数|n.;excerpt|节选|n.;permission|许可|n.
vegetable|蔬菜|n.;unchanged|未改变的|adj.;ingredient|成分|n.;allergy|过敏|n.;purchasing|购买的|adj.;benefit|益处|n.;dairy|乳制品|n.;sauce|酱汁|n.
collect|收集|v.;covered|有盖的|adj.;tank|储罐|n.;filter|过滤器|n.;contractor|承包商|n.;necessary|必要的|adj.;demand|需求|n.;log|记录簿|n.
advertisement|广告|n.;concentrate|集中注意力|v.;specification|规格说明|n.;adjustable|可调节的|adj.;warranty|保修期|n.;verify|核实|v.;delivery|配送|n.;condition|条件|n.
harbour|港口|n.;reserve|预订|v.;slot|时段|n.;revenue|收入|n.;crowding|拥挤|n.;encourage|鼓励|v.;season|季节|n.;included|包含在内的|adj.
headline|标题|n.;volunteer|志愿者|n.;represent|代表|v.;sample|样本|n.;evidence|证据|n.;broader|更广泛的|adj.;recruit|招募|v.;participant|参与者|n.
unfamiliar|陌生的|adj.;attempt|尝试|n.;separate|分开|v.;performance|表现|n.;weakness|弱项|n.;realistic|现实可行的|adj.;structure|结构|n.;transfer|迁移运用|n.
application|申请|n.;identification|身份证明|n.;appointment|预约|n.;deposit|押金|n.;inspection|检查|n.;electricity|电力|n.;repair|维修|n.;brochure|宣传册|n.
employee|员工|n.;intake|新一批成员|n.;subsidy|补贴|n.;cause|导致|v.;tiring|累人的|adj.;extend|扩展|v.;scheme|方案|n.;salary|工资|n.
convert|改造|v.;accessible|易到达的|adj.;entrance|入口|n.;reception|接待处|n.;workshop|工作坊|n.;operating|运营的|adj.;storage|储藏|n.;step-free|无台阶的|adj.
suitable|合适的|adj.;towel|毛巾|n.;outdoor|户外的|adj.;warning|警告|n.;advance|提前的|adj.;trial|试用|n.;guarantee|保证|v.;monthly|每月的|adj.
engagement|参与投入|n.;factual|事实性的|adj.;distinct|不同的|adj.;voluntary|自愿的|adj.;allocate|分配|v.;randomly|随机地|adv.;retention|记忆保留|n.;immediate|即时的|adj.
equipment|设备|n.;respectively|分别地|adv.;category|类别|n.;decline|下降|v.;transaction|交易/办理次数|n.;comparison|比较|n.;figure|数字|n.;income|收入|n.
facility|设施|n.;sort|分类|v.;mixture|混合物|n.;roller|滚筒|n.;excess|多余的|adj.;sequence|顺序|n.;operator|操作人员|n.;summary|摘要|n.
fund|资助|v.;programme|项目|n.;participate|参与|v.;critic|批评者|n.;barrier|障碍|n.;access|获取机会|n.;policy|政策|n.;evaluation|评估|n.
instructor|指导者|n.;locate|定位|v.;plausible|貌似合理的|adj.;contrast|对比|n.;maintain|保持|v.;issue|签发|v.;spelling|拼写|n.;unseen|未见过的|adj.
booking|预订|n.;experienced|有经验的|adj.;purpose|目的|n.;revise|修订|v.;duplicate|重复的|adj.;sufficient|足够的|adj.;concrete|具体的|adj.;publish|发布|v.
contamination|污染/杂物混入|n.;inspector|检查员|n.;container|容器|n.;acceptable|可接受的|adj.;sample|样本|n.;limited|有限的|adj.;quality|质量|n.;weight|重量|n.
automated|自动化的|adj.;highlight|标出|v.;intended|原本意图的|adj.;accept|接受|v.;reject|拒绝|v.;argument|论证|n.;proposal|提议|n.;certainty|确定性|n.
corridor|交通走廊|n.;median|中位数|n.;peak|高峰|n.;fare|票价|n.;isolate|分离|v.;attribute|归因|v.;demand|需求|n.;evaluation|评估|n.
discount|折扣|n.;advertising|广告宣传|n.;format|形式|n.;artistically|艺术上|adv.;superior|更优的|adj.;unsupported|无依据的|adj.;plausible|貌似合理的|adj.;preference|偏好|n.
pilot|试点|n.;clinic|诊所|n.;voluntary|自愿的|adj.;outcome|结果|n.;participation|参与|n.;overstatement|夸大|n.;compulsory|强制的|adj.;limitation|局限|n.
subscription|订阅|n.;cancellation|取消|n.;renewal|续订|n.;condition|条件|n.;permanently|永久地|adv.;assumption|假设|n.;continuing|持续的|adj.;charge|收费|n.
remote|远程的|adj.;interview|访谈|n.;development|开发项目|n.;association|关联|n.;causal|因果的|adj.;trend|趋势|n.;constraint|限制|n.;recommend|建议|v.
coastal|沿海的|adj.;retain|保留|v.;narrow|狭窄的|adj.;initial|最初的|adj.;queue|队伍|n.;redistribution|重新分布|n.;reservation|预订|n.;actual|实际的|adj.
interface|界面|n.;unfinished|未完成的|adj.;blank|空白的|adj.;adjust|调整|v.;uncertainty|不确定性|n.;technical|技术的|adj.;interruption|中断|n.;interpret|解读|v.
continuous|连续的|adj.;attention|注意力|n.;concentration|专注|n.;tiredness|疲惫|n.;appropriate|适当的|adj.;readiness|准备程度|n.;process|过程|n.;pattern|模式|n.
institution|机构|n.;overall|总体的|adj.;component|单项|n.;qualified|有资质的|adj.;independent|独立的|adj.;response|回应|n.;postpone|推迟|v.;deadline|截止日期|n.
unseen|未见过的|adj.;confusion|混淆|n.;field|填写栏|n.;focused|有针对性的|adj.;condition|条件|n.;stability|稳定性|n.;repeatable|可重复实现的|adj.;flattering|让人满意的|adj.
relevant|相关的|adj.;unsupported|无依据的|adj.;clarify|澄清|v.;independently|独立地|adv.;judgment|判断|n.;estimate|估计|n.;draft|草稿|n.;guaranteed|被保证的|adj.
constraint|限制|n.;category|类别|n.;calendar|日程表|n.;sustainable|可持续的|adj.;extension|延长|n.;requirement|要求|n.;routine|惯例|n.;decision|决定|n.
'''.strip().splitlines()

TOPICS = ['your name and studies', 'daily routines', 'family and friends', 'places on campus', 'food and shopping', 'sport and hobbies', 'a past experience', 'travel and transport', 'future plans', 'comparing choices', 'healthy routines', 'your learning progress', 'learning methods', 'work and careers', 'changes in your city', 'technology in daily life', 'friendship', 'films and music', 'food choices', 'saving resources', 'advertising', 'tourism', 'news and information', 'learning independently', 'where you live', 'work schedules', 'public places', 'sports facilities', 'education', 'useful equipment', 'recycling', 'public services', 'reading strategies', 'instructions at work', 'environmental projects', 'automated feedback', 'city transport', 'cultural events', 'appointment systems', 'subscriptions', 'social changes', 'visitor management', 'preparing for a test', 'concentration', 'learning goals', 'consistent performance', 'receiving feedback', 'future learning']

PART_ONE = [
 ['What is your name?', 'Where are you from?', 'What do you study?'],
 ['What time do you get up?', 'When do you study English?', 'What do you do after dinner?'],
 ['Who is in your family?', 'What do you do with your friends?', 'Who helps you when you study?'],
 ['Where is your classroom?', 'Is there a library near your home?', 'Where do you like to sit after class?'],
 ['What food do you like?', 'Where do you buy fruit?', 'Can you make a simple meal?'],
 ['What sport do you enjoy?', 'Can you swim?', 'What hobby do you want to try?'],
 ['What did you do last weekend?', 'Did you visit a new place recently?', 'Who went with you?'],
 ['How do you travel to university or work?', 'Do you enjoy train journeys?', 'What happened on your last journey?'],
 ['What are you going to do this weekend?', 'When will you practise English tomorrow?', 'What skill do you want to learn?'],
 ['Do you prefer a quiet or busy study room?', 'What matters when you buy headphones?', 'Which place in your city do you like best?'],
 ['When do you usually go to bed?', 'Do you take breaks when you study?', 'When can you go for a short walk?'],
 ['What can you say in English now?', 'Which activity is still difficult?', 'What will you practise next week?'],
 ['How do you review new words?', 'Do you prefer studying alone or with someone?', 'What do you do when you forget a word?'],
 ['What kind of work interests you?', 'Have you tried a short placement?', 'Do you like explaining things to others?'],
 ['Has your neighbourhood changed recently?', 'How often do you visit local parks?', 'What improvement would you like to see?'],
 ['What do you use your phone for?', 'Do you keep digital notes?', 'How do you save important files?'],
 ['How did you meet a close friend?', 'What makes a friend helpful?', 'How do you stay in touch when you are busy?'],
 ['What kind of music do you like?', 'Do you prefer watching films at home or at a cinema?', 'What film do you remember from childhood?'],
 ['Where do you usually have lunch?', 'Do you read ingredient labels?', 'What affects your choice of a meal?'],
 ['Do you recycle at home?', 'How can your household save water?', 'Have you seen a local environmental project?'],
 ['Where do you usually see advertisements?', 'Do advertisements influence your purchases?', 'What do you check before buying something?'],
 ['Do you prefer short trips or long holidays?', 'What do you enjoy in a new place?', 'How do you choose transport when travelling?'],
 ['Where do you get news?', 'Do you check the source of an article?', 'Have you seen a misleading headline?'],
 ['How do you know you have made progress?', 'What do you do after making a mistake?', 'Do you enjoy learning independently?'],
 ['What do you like about where you live?', 'Would you prefer to share a home?', 'What would you change about your room?'],
 ['What time of day do you work or study best?', 'Do you prefer long or short study sessions?', 'How do you organise a busy week?'],
 ['What public building do you use most?', 'Is it easy to get there?', 'What makes a place comfortable for visitors?'],
 ['What sports facilities are near your home?', 'Have you joined a beginner class?', 'Would you prefer indoor or outdoor exercise?'],
 ['What subject did you enjoy at school?', 'Do you learn well from practical tasks?', 'What makes a lesson interesting?'],
 ['What equipment helps you study?', 'Have you ever borrowed a laptop or camera?', 'What do you consider before buying a device?'],
 ['Is recycling convenient where you live?', 'Do you understand the labels on local bins?', 'How could recycling be made easier?'],
 ['What public service do you use regularly?', 'Are local services easy to access?', 'What would improve a community programme?'],
 ['What do you like reading?', 'How do you handle unfamiliar words?', 'Do you check evidence when answering questions?'],
 ['Have you followed a difficult set of instructions?', 'Do you prefer instructions with pictures?', 'What makes an explanation clear?'],
 ['Have you joined an environmental activity?', 'What changes have you noticed locally?', 'How do you judge whether a project is useful?'],
 ['Have you used a tool to check your writing?', 'Do you accept every suggestion?', 'What kind of feedback helps you most?'],
 ['How often do you use public transport?', 'What matters most on a bus journey?', 'Would you like to cycle more often?'],
 ['Have you attended a local cultural event?', 'Do you prefer short or long concerts?', 'What might encourage you to attend more events?'],
 ['How do you usually book an appointment?', 'Do you prefer calls or messages as reminders?', 'Have you ever missed an appointment?'],
 ['Do you pay for any subscriptions?', 'How do you decide whether a service is worth paying for?', 'Do you read cancellation terms?'],
 ['Has working or studying from home affected your routine?', 'What shops do you use near home?', 'What change has surprised you in recent years?'],
 ['Have you visited a crowded tourist place?', 'Do you prefer booking ahead?', 'What can make a visit more comfortable?'],
 ['How do you prepare your equipment before studying?', 'Have you used a computer-based test interface?', 'What makes you feel prepared?'],
 ['When do you find it easiest to concentrate?', 'What distracts you when studying?', 'How do you take breaks?'],
 ['What learning goal are you working towards?', 'How do you decide whether a goal is realistic?', 'Would you change a deadline if needed?'],
 ['Does your performance vary from day to day?', 'How do you keep a useful record of practice?', 'What repeated mistake have you improved?'],
 ['Who gives you useful feedback?', 'How do you respond when reviewers disagree?', 'Do you keep earlier drafts of your work?'],
 ['What would you like to learn after this plan?', 'Will you keep studying with your partner?', 'How will you decide your next step?'],
]

BEGINNER_DISCUSSIONS = [
 ['Why do you want to learn English?', 'How can your friend help you?'],
 ['Is your weekend routine different?', 'Do you like studying in the morning or evening?'],
 ['What do you like doing with a friend?', 'Why is helping each other useful?'],
 ['Do you prefer a quiet room or a garden?', 'What makes a place easy to find?'],
 ['Is cooking at home easy for you?', 'What can two friends share when shopping?'],
 ['Is trying a new sport difficult?', 'Why do people enjoy hobbies?'],
 ['What made your last trip interesting?', 'Would you visit the same place again?'],
 ['Do you prefer buses or trains?', 'Why should we check a timetable?'],
 ['Is a small daily plan easy to keep?', 'What will you do if a lesson is difficult?'],
 ['Is a bigger room always better?', 'Why do people make different choices?'],
 ['Why is taking a break useful?', 'Who can give qualified health advice?'],
 ['Why is repeating a difficult lesson useful?', 'How can you tell your partner what you need?'],
]

DEBATES = [
 'What is your name, major and hometown? Write six clear sentences. Use I am and I study. 可先写 40–60 词。',
 'Describe an ordinary weekday. Explain when you can study English. 写 60–80 词，至少使用一个频率词。',
 'Introduce a family member or friend and explain one thing you do together. 写 60–80 词，检查物主词。',
 'Describe your campus or neighbourhood so a visitor can find two places. 写 60–80 词，使用方位介词。',
 'Describe a meal you can make and the ingredients you need. 写 60–80 词，检查可数与不可数名词。',
 'Explain a hobby you enjoy and a skill you want to learn. 写 80 词左右，练习 can 与 like doing。',
 'Describe a visit you made and one thing that happened. 写 80 词左右，至少用三个过去式。',
 'Describe a journey, including the route and one problem. 写 80–100 词，清楚说明先后顺序。',
 'Explain your study plan for the next month and why it is realistic. 写 80–100 词，区分打算与承诺。',
 'Compare two places where you could study. Which would you choose and why? 写 80–100 词，比较两个维度。',
 'Describe changes you could make to your study routine to feel less tired. 写 80–100 词；不编造医疗效果。',
 'Describe what you can do now, what is still difficult and your next step. 写 80–100 词，检查现在/过去/未来。',
 'Is reviewing a small set of words better than learning a large set once? Explain your view with an example. 写 120–150 词。',
 'Should students try a short work placement before choosing a career? Give benefits and a limitation. 写 120–150 词。',
 'Describe a change in your city. Who benefits and what problem may remain? 写 120–150 词。',
 'What makes a learning tool useful? Discuss ease of use, privacy and backup. 写 120–150 词。',
 'What makes a study partnership sustainable? Explain a practical agreement. 写 120–150 词。',
 'Should local communities organise low-cost cultural events? Give reasons and an example. 写 120–150 词。',
 'How can cafes help customers make informed food choices? Discuss labels and access. 写 120–150 词。',
 'Describe a resource-saving project and explain how its effect should be checked. 写约 150 词。',
 'How should consumers evaluate an advertisement? Give checkable criteria. 写约 150 词。',
 'Discuss one benefit and one cost of tourism for a small community. 写约 150 词。',
 'How can a reader decide whether a headline is supported by an article? 写约 150 词，用一个例子。',
 'Describe a useful learning method, its limits and how you would assess progress. 写约 150 词。',
 'Some people prefer shared student accommodation; others prefer living alone. Discuss both views and give your opinion.',
 'Some employers prefer shorter training weeks with longer days. Do the advantages outweigh the disadvantages?',
 'Cities should convert unused buildings into community spaces rather than demolish them. To what extent do you agree?',
 'Public sports facilities should be free for everyone. To what extent do you agree?',
 'Some people think practical tasks are more effective than lectures. Discuss both views and give your opinion.',
 'Universities should lend equipment instead of requiring every student to buy it. To what extent do you agree?',
 'Individuals or governments: who should take greater responsibility for recycling? Discuss both views and give your opinion.',
 'Many residents do not use local exercise programmes. What are the causes and what solutions can be proposed?',
 'Examinations place too much emphasis on speed rather than understanding. To what extent do you agree?',
 'Clear workplace communication is more important than advanced vocabulary. To what extent do you agree?',
 'Environmental projects should be judged by measured results rather than publicity. To what extent do you agree?',
 'Automated feedback should replace teachers in language learning. To what extent do you agree?',
 'Cities should prioritise public transport over private cars. Discuss the advantages and disadvantages.',
 'Discounted cultural events help communities. Do the advantages outweigh the disadvantages?',
 'Digital public services can exclude some users. What problems does this create and how can they be addressed?',
 'Advertisements should display the total long-term cost of subscriptions. To what extent do you agree?',
 'Working from home changes local communities. Discuss positive and negative effects.',
 'Popular tourist places should require reservations. Do the advantages outweigh the disadvantages?',
 'Students should learn how to use examination tools before taking a test. To what extent do you agree?',
 'Schools should teach time management as well as subject knowledge. To what extent do you agree?',
 'Setting realistic goals is more useful than competing with others. To what extent do you agree?',
 'A single examination is not the best way to judge a learner. Discuss both views and give your opinion.',
 'Feedback is most useful when learners understand the reasons behind it. To what extent do you agree?',
 'Lifelong learning should be a personal responsibility rather than an employer’s responsibility. Discuss both views and give your opinion.',
]

ACADEMIC_GRAMMARS = [
 ('字数限制、词性与拼写', '先看题目要求。本站填空以选项模拟，正式填空需自己拼写且遵守字数限制。预测空格词性，再从录音确认，不把听到的第一个数字当最终答案。', ['The appointment is at ten forty.', 'The deposit is sixty pounds.'], [('“NO MORE THAN TWO WORDS” allows ___.', 'one or two words', 'three words', 'any length'), ('In “The deposit is ___ pounds”, the gap needs ___.', 'a number', 'a verb', 'a conjunction'), ('Which spelling matches L-A-N-E?', 'Lane', 'Laine', 'Lain')]),
 ('True / False / Not Given', 'True 是原文支持；False 是原文明确反驳；Not Given 是信息不足。先划证据句。原文“some”不能自动证明“all”，也不能一律判断 False，要看是否存在反例。', ['Some people attended. This does not establish that everyone attended.', 'The total stayed the same. It did not decrease.'], [('Text: “The total stayed the same.” Claim: “The total decreased.”', 'False', 'True', 'Not Given'), ('Text: “Thirty staff joined.” Claim: “All were left-handed.”', 'Not Given', 'False', 'True'), ('Text: “The group had thirty people.” Claim: “Thirty people joined the group.”', 'True', 'False', 'Not Given')]),
 ('方向与段落主旨', '地图先确定入口、参照点与方向；left/right 会随行进方向变化。标题匹配关注整段功能，而非一个重复词。段落主旨应覆盖多数信息，避免过宽或过窄。', ['The room is to the left of reception.', 'The paragraph describes the interior layout.'], [('“Behind the building” means ___.', 'at the back', 'at the front', 'upstairs'), ('A good paragraph heading covers ___.', 'the main idea', 'only one repeated word', 'an unrelated example'), ('“Go straight, then turn right” means the first action is ___.', 'go straight', 'turn left', 'go upstairs')]),
 ('干扰信息与同义改写', '听到更改、否定、but/however 时注意后面的最终信息。preferred 与 liked 可同义，但 supply 与 require 意思不同。先看问题问价格、时间还是物品。', ['It used to be Wednesday; it is now Thursday.', 'We supply rackets; bring your own shoes.'], [('“It used to be Monday; now Tuesday.” The current day is ___.', 'Tuesday', 'Monday', 'both'), ('“We supply towels” means ___.', 'Towels are provided.', 'Bring your own towel.', 'Towels are prohibited.'), ('“Five for the trial, twenty monthly.” Trial price is ___.', 'five', 'twenty', 'twenty-five')]),
 ('摘要词性与转折', '通过句子结构预测名词、动词、数字。however 往往纠正期待；“reported greater engagement”不是“proved better retention”。比较研究必须区分观察结果和解释。', ['Engagement increased; however, quiz scores were similar.', 'Students were allocated randomly.'], [('After “greater”, the gap in “greater ___” may be ___.', 'a noun', 'a complete question', 'an unrelated date'), ('“However” often signals ___.', 'contrast', 'identical information', 'a guaranteed cause'), ('“Scores were similar” means ___.', 'no clear score difference is stated', 'one group doubled its score', 'no quiz existed')]),
 ('Task 1 overview 与比较', '图表先指出主要趋势、最大项或例外，再选数字支持。increase from A to B 表起终值，increase by X 表增量。数据未给原因时不要编造解释。', ['Users increased from 40 to 90.', 'This was an increase of 50.', 'Cameras were the only declining category.'], [('From 40 to 90 is an increase of ___.', '50', '90', '40'), ('An overview should emphasise ___.', 'main patterns', 'every number equally', 'invented causes'), ('“More than doubled” from 40 requires a final value ___.', 'above 80', 'exactly 60', 'below 40')]),
 ('过程顺序与被动语态', '流程按提供的箭头写 first/then/after/finally。be + 过去分词突出材料或步骤。地图用位置与变化描述；不要把个人建议加入客观 Task 1。', ['Paper is sorted before it is mixed with water.', 'The sheets are dried and cut.'], [('Which is passive?', 'Paper is sorted.', 'Workers sort paper.', 'Paper sorts workers.'), ('“A before B” means ___.', 'A happens first', 'B happens first', 'both are forbidden'), ('A factual process summary should avoid ___.', 'unsupported opinions', 'clear sequence', 'given steps')]),
 ('审题与观点展开', '先区分讨论双方、同意程度、利弊、问题原因与解决办法。一个主体段用观点→解释→相关例子→回扣题目。例子可以合理假设，但不要伪造研究和统计。', ['One barrier is transport.', 'For example, a late bus can prevent attendance.'], [('“Discuss both views” requires ___.', 'both views to be addressed', 'only one view', 'only a list of words'), ('A useful example should ___.', 'support the paragraph claim', 'change to an unrelated topic', 'invent a named study as fact'), ('“To what extent do you agree?” needs ___.', 'a clear position', 'no position', 'only a copied introduction')]),
 ('证据定位与复盘分类', '将词义、证据定位、逻辑范围、拼写、错栏分开记录。复做同一道题检验是否理解修改；新材料才检验迁移，不把复做正确率当首次测量。', ['The claim needs evidence in the passage.', 'This result is a repeat, not a first attempt.'], [('A repeated task mainly checks ___.', 'review of familiar material', 'unseen-test performance', 'an official band'), ('A plausible statement without evidence may be ___.', 'unsupported', 'automatically true', 'automatically false in every case'), ('A wrong answer field is mainly a ___ error.', 'recording/entry', 'word meaning', 'topic knowledge')]),
 ('限定语、相关与因果', 'may/some/in the sample 限定结论。A 与 B 同时变化只能提示关联；存在其他变化时，不能直接断言 A 导致 B。用 although/while 保持论述平衡。', ['Sales rose, but advertising also increased.', 'This may explain part of the change.'], [('“May explain” expresses ___.', 'possibility', 'certainty', 'impossibility'), ('Two simultaneous changes alone prove ___.', 'no sole cause', 'one guaranteed cause', 'every possible cause'), ('“In this sample” limits a claim to ___.', 'the observed sample', 'all people', 'all future years')]),
 ('回应任务与段落逻辑', '先检查是否回答题目，再改词句。代词明确、段落顺序合理、例子与观点有解释链接。结论不加入新论点；更长或更复杂并不自动更好。', ['This example supports the claim because access improved.', 'The conclusion summarises the argument.'], [('The first revision priority is often ___.', 'answering the task', 'adding rare words', 'increasing length at any cost'), ('A conclusion should avoid ___.', 'a new unsupported claim', 'a concise summary', 'a clear position'), ('An example needs ___.', 'a clear link to the claim', 'only a number', 'an unrelated story')]),
 ('练习评估与分数边界', '本站微练习得分是答对题数/题量，不换算雅思分数。写说反馈是学习建议；正式要求需核查当前接收机构。总分目标和单项门槛都要满足。', ['Practice feedback is not an official result.', 'An overall target does not remove component requirements.'], [('A micro-quiz percentage is ___.', 'practice accuracy', 'an IELTS band', 'a pass certificate'), ('An unmet component minimum is ___.', 'still a requirement to address', 'always cancelled by a high average', 'irrelevant'), ('Calendar completion alone proves ___.', 'neither a guaranteed score nor readiness', 'a guaranteed band 6', 'a guaranteed exam pass')]),
]

def vocab_for_week(index, text):
    import re
    sentences = re.split(r'(?<=[.!?])\s+', text)
    entries = []
    for item in VOCABULARY[index].split(';'):
        word, meaning, pos = item.split('|')
        # 同时允许词形变化；若词形不在文中，给出独立原创词卡例句。
        match = next((s for s in sentences if re.search(r'\b' + re.escape(word.rstrip('e')) + r'\w*', s, re.I)), None)
        if not match:
            match = EXTRA_EXAMPLES[word]
        entries.append({'word': word, 'meaning': meaning, 'partOfSpeech': pos, 'example': match})
    return entries

EXTRA_EXAMPLES = {
 'available': 'The meeting room is available on Friday.', 'verify': 'We verify the total price before buying.',
 'salary': 'The report does not include each employee’s salary.',
 'walk': 'I walk to class with my friend.', 'classroom': 'Our classroom is above the music room.',
 'egg': 'I need six eggs for this meal.', 'rent': 'We rent a bike for an hour.', 'quiet': 'The quiet room helps me concentrate.',
 'suggest': 'The results suggest a possible explanation.', 'interrupt': 'Please do not interrupt your partner.',
 'recruit': 'The club will recruit volunteers next month.', 'transfer': 'A new task can check whether skills transfer.',
 'constraint': 'Time is an important constraint when we make a plan.', 'recommend': 'I recommend checking the source first.',
 'preference': 'Her preference is for shorter afternoon concerts.', 'limitation': 'A small sample is a limitation of this study.',
 'charge': 'The total includes a delivery charge.', 'confusion': 'The similar numbers caused confusion.',
 'decision': 'We will make a decision after reviewing the evidence.', 'requirement': 'Check each score requirement before booking.',
 'extension': 'A short extension can give us more time to practise.',
}

def task_one(week):
    if week <= 12:
        return '基础表达练习（不是正式雅思 Task 1）：从本周阅读选三句，改写为你自己的真实情况；再写两个问题问搭档。先保证主语、动词和时间清楚。'
    if week <= 24:
        return '短文概括练习（不是正式雅思 Task 1）：用 60–90 词概括本周阅读的主要信息，区分事实、观点和未知信息。不要逐句复制；最后列出一处支持你概括的证据。'
    if week in (27, 31, 35, 39, 43, 47):
        if week % 2:
            return '原创学术类 Task 1 流程题：旧纸收集 → 去除塑料封面 → 加水混合 → 清洁混合物 → 滚筒去除多余水分 → 烘干 → 裁切。写至少 150 词，约 20 分钟；概述起点终点和步骤，不编造机器温度，不加入个人观点。'
    if week in (28, 32, 36, 40, 44, 48):
        return '原创学术类 Task 1 地图题：一个虚构校园在 2020 年有北侧图书馆、东侧停车场、西侧花园和南侧大门；2025 年图书馆向西扩建，停车场改为体育馆，花园移到体育馆南侧，大门位置不变。写至少 150 词，约 20 分钟；描述主要变化与不变部分，可先自行画草图。'
    base = 80 + week * 2
    return f'原创学术类 Task 1 表格题：虚构学校 2020/2024 年借用设备的学生人数分别为：电脑 {base}/{base+60}，相机 {base-30}/{base-40}，录音机 {base-50}/{base+10}。写至少 150 词，约 20 分钟；先概述趋势，再选比较。单位是学生人数，不是设备数量；不要推断原因。'

def build():
    assert len(SCENARIOS) == len(VOCABULARY) == len(TOPICS) == len(DEBATES) == 48
    # JSON 随仓库提交，后续可在没有原 Word 工程的电脑上重新生成。
    # 首次构建读取原工程周标题；已有课程则以已保存标题为准。
    if (OUT / 'curriculum.json').exists():
        existing = json.loads((OUT / 'curriculum.json').read_text(encoding='utf-8'))
        source_weeks = [(w['title'], '', '', w['level']) for w in existing]
    else:
        import ast
        tree = ast.parse((SOURCE / 'build_ielts_plan.py').read_text(encoding='utf-8'))
        source_weeks = next(ast.literal_eval(node.value) for node in tree.body
                            if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == 'weeks' for t in node.targets))
    lessons = []
    for index, scenario in enumerate(SCENARIOS):
        week = index + 1
        title, reading, listening, reading_facts, listening_facts = scenario
        grammar = GRAMMARS[index] if index < 24 else ACADEMIC_GRAMMARS[(index-24) % 12]
        grammar_title, explanation, examples, grammar_facts = grammar
        topic = TOPICS[index]
        part1 = PART_ONE[index]
        cue = f'Describe a person, place or experience connected with {topic}. You should say: what it is; when you encountered it; one specific detail; and explain why it matters to you.'
        if week == 1:
            cue = 'Describe yourself to a new friend. Say your name, your hometown, your major and one thing you like. 初学先说 4–6 句，不要求满 2 分钟。'
        elif week <= 12:
            cue += ' 初学先准备 4 个要点，说 30–60 秒；达到流利可理解后再延长。'
        else:
            cue += ' 准备 1 分钟，尽量连续说 1–2 分钟；不背完整稿。'
        lessons.append({
            'week': week, 'title': source_weeks[index][0], 'level': source_weeks[index][3] if week <= 24 else 'IELTS-style',
            'grammar': {'title': grammar_title, 'explanation': explanation, 'examples': examples,
                        'questions': [question(f'w{week}-g-{i+1}', p, a, b, c,
                                               f'正确表达：“{p.replace("___", a)}”。本题规则：{explanation}')
                                      for i, (p, a, b, c) in enumerate(grammar_facts)]},
            'vocabulary': vocab_for_week(index, reading + ' ' + listening),
            'reading': {'title': f'原创阅读 {week} · {title}', 'text': reading,
                        'questions': passage_questions(week, 'r', reading, reading_facts)},
            'listening': {'title': f'原创对话/讲解 {week} · {title}', 'text': listening,
                          'questions': passage_questions(week, 'l', listening, listening_facts)},
            'writing': {'task1': task_one(week), 'task2': DEBATES[index] + (' 原创雅思风格练习：写至少 250 词，完整练习约 40 分钟。日常 30 分钟可先写提纲或主体段，另日完成全文；不冒充完整限时作文。' if week > 24 else '')},
            'speaking': {'part1': part1, 'part2': cue,
                         'part3': BEGINNER_DISCUSSIONS[index] if week <= 12 else
                                  [f'What benefits and limitations can {topic} have for a community?',
                                   f'How might people of different ages approach {topic} differently? Explain rather than stereotype.']},
        })
    original_plan = SOURCE / 'plan_schedule_check.json'
    plan_path = original_plan if original_plan.exists() else OUT / 'plan.json'
    plan = json.loads(plan_path.read_text(encoding='utf-8'))
    assert len(plan) == 336
    resources = [
        {'title': 'IELTS 官方样题', 'category': '考试样题', 'description': '查看官方提供的听说读写示例及说明；站内原创题不能替代完整官方材料。', 'url': 'https://ielts.org/take-a-test/preparation-resources/sample-test-questions', 'licenseNote': '官方站点外链；未在本站复制试卷或音频。使用遵循来源条款。'},
        {'title': 'IELTS 官方评分说明', 'category': '评分标准', 'description': '核对听读计分、写说评分标准与总分规则。本站正确率、互评和 AI 建议不是官方成绩。', 'url': 'https://ielts.org/take-a-test/your-results/ielts-scoring-in-detail', 'licenseNote': '官方站点外链；评分描述版权归权利人。'},
        {'title': 'British Council LearnEnglish', 'category': '分级学习', 'description': '官方分级听读、语法和词汇学习资源。需要更多不同文本时从 A1/A2 开始。', 'url': 'https://learnenglish.britishcouncil.org/', 'licenseNote': '官方站点外链；没有复制其文章、题目或录音。'},
        {'title': 'British Council IELTS Ready', 'category': '考试备考', 'description': '官方备考服务入口；部分资源可能要求注册或满足地区与报名条件。', 'url': 'https://takeielts.britishcouncil.org/take-ielts/prepare/ielts-ready', 'licenseNote': '外部官方服务；以当前服务条款、授权和可访问情况为准。'},
        {'title': 'IDP 雅思准备', 'category': '考试备考', 'description': '另一官方考试合作方提供的准备入口，补充考试形式和备考信息。', 'url': 'https://ielts.idp.com/prepare', 'licenseNote': '外链；不在本站托管其受版权保护试卷。'},
        {'title': 'Cambridge Dictionary', 'category': '词典', 'description': '核查学习词汇的发音、词性和含义；站内词卡是原创学习释义。', 'url': 'https://dictionary.cambridge.org/', 'licenseNote': '官方词典外链；未复制词典例句、音标或发音音频。'},
    ]
    metadata = {
        'version': 1, 'language': 'zh-CN', 'weeklyLessonCount': 48, 'dailyPlanCount': 336,
        'contentOrigin': '本站 48 份原创微课程，每周一份阅读、一份对话/讲解、词卡、语法和写说提示，可多日复盘。不是 336 套独立试卷，也不是完整雅思真题。',
        'audioNotice': '站内语音合成仅朗读原创脚本，用于初级听辨和跟读。声音、语速、时长和题量不等同真实考试音频；首次听时应隐藏脚本。',
        'scoreNotice': '客观题仅统计本次练习正确率，不换算 IELTS 分数。本站题型和题量不足以进行官方原始分换算。AI/搭档写说评语是建议，不是正式评分。',
        'planMapping': '每日通过 week 关联本站微课程；原 Word 计划的 R1/R2/L1/L2 可先用本周原创材料做首练、复述或复盘。站内只有每周一阅读一听力，不把同一材料重做算作新的能力测量。',
        'examMaterialBoundary': '原计划 X/Y/Z 及完整模拟任务保留原文，仍需合法购买的题册或官方允许的样题。本站没有复制付费 Cambridge 题册，不声称现有微练习等同完整模考。',
        'readingNotice': '基础周使用短文；后期是 IELTS-style 微练习，题量、篇幅和难度并非完整考试。匹配与填空使用备选项，正式填空还要检查自主拼写及字数限制。',
        'grammarNotice': '前 24 周建立基础与复合句；后 24 周复盘题型语言、证据范围、结构及评估边界，不以重复同一规则代替新题测量。',
        'resourceLinkNotice': '主要学习练习可在站内完成；官方资源、正版整套材料与人工反馈仍可能需要外部入口。全真测量和真实成绩不由本站微练习替代。',
        'dailyRoutine': {'vocabularyMinutes': 10, 'mainTaskMinutes': 30, 'speakingMinutes': 15, 'reflectionMinutes': 5},
    }
    for name, value in [('curriculum', lessons), ('plan', plan), ('resources', resources), ('content-metadata', metadata)]:
        (OUT / f'{name}.json').write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'生成 {len(lessons)} 周、{len(plan)} 天、{sum(len(w["vocabulary"]) for w in lessons)} 词卡、{sum(len(w[s]["questions"]) for w in lessons for s in ("reading", "listening", "grammar"))} 题。')

if __name__ == '__main__':
    build()
