"""Build the study collection from the conversation and phrasal-verb PDF references."""

import argparse, json, re, unicodedata
from pathlib import Path
from collections import Counter
import pdfplumber

def rows(path, columns):
    with pdfplumber.open(path) as pdf:
        return [(page_no, [' '.join((c or '').split()) for c in row])
                for page_no, page in enumerate(pdf.pages, 1)
                for table in page.extract_tables() for row in table
                if len(row) == columns and (row[0] or '').strip().isdigit() and row[1] and row[2]]

def ids(spec):
    return [i for part in spec.split() for i in range(int(part.split('-')[0]), int(part.split('-')[-1])+1)]

def key(s):
    return re.sub(r"[^\w\s]", "", s.casefold().replace("’", "'")).strip()

def clean(s):
    return unicodedata.normalize("NFC", s.strip()).replace("’", "'")

def fixes(s):
    return {int(i): (en, vi) for i,en,vi in (line.split('|',2) for line in s.splitlines())}


# Corrections keep their original IDs. New phrases get fresh IDs so previously
# learned cards cannot mark a different phrase as learned.
CORRECTIONS = dict(
    (old, (english, vietnamese))
    for old, english, vietnamese in (line.split("|") for line in """Good morning|Good morning|Chào buổi sáng
Thank you very much|Thank you very much|Cảm ơn bạn rất nhiều
Thanks for your help|Thanks for your help|Cảm ơn bạn đã giúp
Can you help me?|Can you help me?|Bạn có thể giúp tôi được không?
Can we have some more bread please?|Can we have some more bread, please?|Cho chúng tôi thêm bánh mì được không?
I need a doctor|I need a doctor|Tôi cần gặp bác sĩ
I'd like a room|I'd like a room|Tôi muốn đặt một phòng
How are you paying?|How are you paying?|Bạn muốn thanh toán bằng cách nào?
How much do I owe you?|How much do I owe you?|Tôi phải trả bạn bao nhiêu?
I need to practice my English|I need to practice my English|Tôi cần luyện tiếng Anh
How far is it?|How far is it?|Cách đây bao xa?
It's suppose to rain tomorrow|It's supposed to rain tomorrow|Theo dự báo, ngày mai trời sẽ mưa
Do you think it's possible?|Do you think it's possible?|Bạn nghĩ có thể làm được không?
He's not in right now|He's not in right now|Hiện anh ấy không có ở đây
Can I bring my friend?|Can I bring my friend?|Tôi có thể rủ bạn tôi đi cùng không?
What do you recommend?|What do you recommend?|Bạn gợi ý món gì?
What's your email address?|What's your email address?|Địa chỉ email của bạn là gì?
Where is an ATM?|Where's the nearest ATM?|Máy ATM gần nhất ở đâu?
A one way ticket|A one-way ticket|Vé một chiều
A round trip ticket|A round-trip ticket|Vé khứ hồi
Go straight ahead|Go straight ahead|Cứ đi thẳng
I'm leaving tomorrow|I'm leaving tomorrow|Ngày mai tôi đi
Turn left|Turn left|Rẽ trái
Turn right|Turn right|Rẽ phải
When do we leave?|When do we leave?|Khi nào chúng ta đi?
Where is the bathroom?|Where is the bathroom?|Nhà vệ sinh ở đâu?
Are you free tonight?|Are you free tonight?|Tối nay bạn rảnh không?
Are you going to take a plane or train?|Are you going to take a plane or a train?|Bạn sẽ đi máy bay hay tàu hỏa?
Do you sell medicine?|Do you sell medicine?|Ở đây có bán thuốc không?
How many people do you have in your family?|How many people are in your family?|Gia đình bạn có bao nhiêu người?
I have two sisters|I have two sisters|Tôi có hai chị em gái
I've been there|I've been there|Tôi đã từng đến đó
This is my first time there|This is my first time here|Đây là lần đầu tôi đến đây
Can you throw that away for me?|Can you throw that away for me?|Bạn vứt cái đó đi giúp tôi được không?
Forget it|Forget it|Thôi, bỏ qua đi
How do you say it in English?|How do you say it in English?|Cái đó nói bằng tiếng Anh thế nào?
I don't mind|I don't mind|Tôi không phiền đâu
What does this say?|What does this say?|Ở đây viết gì vậy?
Do you have any vacancies?|Do you have any vacancies?|Khách sạn còn phòng trống không?
Fill it up, please|Fill it up, please|Làm ơn đổ đầy bình
If you like it I can buy more|If you like it, I can buy more|Nếu bạn thích thì tôi có thể mua thêm
Try it on|Try it on|Bạn mặc thử đi
What size?|What size?|Cỡ nào?
Can you call me back later?|Can you call me back later?|Bạn gọi lại cho tôi sau được không?
Can you fix this?|Can you fix this?|Bạn sửa cái này được không?
Can you give me an example?|Can you give me an example?|Bạn cho tôi một ví dụ được không?
Can you speak louder please?|Can you speak louder, please?|Bạn nói to hơn một chút được không?
Do you have an appointment?|Do you have an appointment?|Bạn có lịch hẹn không?
Do you like your co-workers?|Do you like your co-workers?|Bạn có quý đồng nghiệp của mình không?
In 30 minutes|In 30 minutes|Sau 30 phút nữa
What do you think?|What do you think?|Bạn nghĩ sao?
What's up?|What's up?|Có gì mới không? (cách chào thân mật)
Who is it?|Who is it?|Ai đấy?
Will you pass me the salt please?|Will you pass me the salt, please?|Bạn đưa giúp tôi lọ muối được không?
Would you ask him to call me back please|Would you ask him to call me back, please?|Bạn nhắn anh ấy gọi lại cho tôi được không?
It hurts here|It hurts here|Tôi đau chỗ này
It's north of here|It's north of here|Chỗ đó nằm về phía bắc
Can I help you?|Can I help you?|Tôi có thể giúp gì cho bạn?
He'll be back in 20 minutes|He'll be back in 20 minutes|Anh ấy sẽ quay lại sau 20 phút nữa
I'm getting ready to go out|I'm getting ready to go out|Tôi đang chuẩn bị ra ngoài
I'm just looking|I'm just looking|Tôi chỉ xem qua thôi
It's going to snow today|It's going to snow today|Hôm nay trời sẽ có tuyết
Now or later?|Now or later?|Bây giờ hay để lát nữa?
When will it be ready?|When will it be ready?|Khi nào thì xong?
I've seen it|I've seen it|Tôi đã xem rồi
What do you do for work?|What do you do for work?|Bạn làm nghề gì?
How's work going?|How's work going?|Công việc dạo này thế nào?
I can't hear you|I can't hear you|Tôi không nghe thấy bạn nói
I'll pay|I'll pay|Để tôi trả tiền
I'll take it|I'll take it|Tôi lấy cái này
I've been here for two days|I've been here for two days|Tôi đã ở đây được hai ngày
Let me think about it|Let me think about it|Để tôi suy nghĩ thêm về việc đó
Next time|Next time|Lần sau
Not recently|Not recently|Dạo gần đây thì không
Tell me|Tell me|Kể tôi nghe đi
That smells bad|That smells bad|Cái đó có mùi khó chịu
That's it|That's it|Vậy thôi, thế là xong
You're very nice|You're very nice|Bạn tốt bụng quá
I don't care|I don't care|Tôi không quan tâm
I'm self-employed|I'm self-employed|Tôi làm việc tự do, tự kinh doanh
get up|get up|dậy khỏi giường, đứng dậy
get by|get by|xoay xở, sống tạm đủ
get through|get through|hoàn thành, vượt qua, gọi điện kết nối được
go off|go off|reo (chuông), nổ, bị ôi
go without|go without|chịu thiếu, xoay xở dù không có
set in|set in|bắt đầu và kéo dài (thường nói về điều bất lợi)
work out|work out|tập thể dục, tìm ra lời giải, diễn ra tốt đẹp
break down|break down|hỏng máy, suy sụp, chia thành các phần nhỏ
call in|call in|gọi người đến hỗ trợ, gọi điện đến
give out|give out|phân phát, cạn kiệt hoặc ngừng hoạt động
read out|read out|đọc thành tiếng
read through|read through|đọc từ đầu đến cuối
turn on|turn on|bật thiết bị
turn off|turn off|tắt thiết bị, làm mất hứng
pass on|pass on|chuyển lời, truyền lại, từ chối nhận
cut back on|cut back on|cắt giảm mức chi tiêu hoặc tiêu thụ
cut down on|cut down on|giảm bớt lượng dùng hoặc tần suất
fall over|fall over|ngã, đổ
send in|send in|gửi nộp, cử vào
blow over|blow over|lắng xuống rồi qua đi
blow up at|blow up at|nổi nóng với ai
catch up with|catch up with|bắt kịp, gặp lại để hỏi thăm
deal out|deal out|chia bài, phân phát
fill in|fill in|điền thông tin, làm thay
move along|move along|đi tiếp, đi khỏi chỗ đang đứng
move aside|move aside|dịch sang một bên
play up|play up|trục trặc, làm nổi bật
play down|play down|làm cho có vẻ ít quan trọng hơn
play out|play out|diễn biến, diễn ra đến kết cục
play into|play into|vô tình tạo lợi thế cho
pull over|pull over|tấp xe vào lề
pull apart|pull apart|kéo rời ra, tách rời
pull in|pull in|tấp vào, vào bến
pull away|pull away|bắt đầu chạy đi, tách ra
push around|push around|bắt nạt, sai khiến
write in|write in|gửi thư hoặc tin nhắn cho một chương trình hay tổ chức
write back|write back|viết thư hoặc nhắn lại
have a good time|have a good time|có khoảng thời gian vui vẻ
spend time with|spend time with|dành thời gian ở bên ai
get a job|get a job|kiếm được việc làm
for a while|for a while|một lúc, trong một thời gian
in advance|in advance|trước, từ trước
be good at|be good at|giỏi làm gì
be late for|be late for|đến muộn, trễ giờ""".splitlines())
)

REPLACEMENTS = dict(
    (old, (english, vietnamese))
    for old, english, vietnamese in (line.split("|") for line in """Do you like the book?|How have you been?|Dạo này bạn thế nào?
Have they met her yet?|It's nice to see you again|Rất vui được gặp lại bạn
Is your house like this one?|Make yourself at home|Cứ tự nhiên như ở nhà nhé
Can you please say that again?|Could you write that down?|Bạn có thể viết lại điều đó được không?
Try to say it|Let me try again|Để tôi thử lại
Why aren't you going?|Could you say that another way?|Bạn có thể diễn đạt theo cách khác được không?
Do you play basketball?|Can I join you?|Tôi tham gia cùng được không?
How much is that?|Is there a discount?|Có giảm giá không?
Are you going to attend their wedding?|Do you have any plans for the weekend?|Cuối tuần bạn có kế hoạch gì chưa?
Can you call back later?|Can I put you on hold?|Bạn có thể chờ máy một chút được không?
Do you know where I can get a taxi?|How long is the wait?|Phải đợi bao lâu?
Is your son here?|Can I leave a message?|Tôi có thể để lại lời nhắn không?
What are you two talking about?|Could you give me a hand?|Bạn giúp tôi một tay được không?
What did you do last night?|How was your day?|Hôm nay của bạn thế nào?
What do you have?|Do you take reservations?|Ở đây có nhận đặt chỗ không?
What is that?|What else do we need?|Chúng ta còn cần gì nữa?
Where can I rent a car?|Is this seat taken?|Chỗ này có ai ngồi chưa?
Where did you learn it?|Could you show me on the map?|Bạn chỉ giúp tôi trên bản đồ được không?
Where is he from?|Does this bus go downtown?|Xe buýt này có vào trung tâm không?
Where is he?|Is it within walking distance?|Có thể đi bộ tới đó không?
Who taught you that?|What brings you here?|Sao bạn lại đến đây vậy?
Will you put this in the car for me?|Could you open the window?|Bạn mở cửa sổ giúp tôi được không?
Do you think it's going to rain tomorrow?|Is it going to clear up?|Trời sắp quang đãng chưa?
At 3 o'clock in the afternoon|What time works for you?|Mấy giờ thì tiện cho bạn?
Do you have this in size 11?|Do you have this in a different size?|Mẫu này có cỡ khác không?
Do you think you'll be back by 11:30?|Can we reschedule?|Mình đổi lịch được không?
How long are you going to stay in California?|I missed my flight|Tôi bị lỡ chuyến bay
How long are you going to stay?|When is the next train?|Khi nào có chuyến tàu tiếp theo?
It's here|I'm on my way|Tôi đang trên đường đến
It's there|I'm running a little late|Tôi sẽ đến muộn một chút
What time did you go to sleep?|What time do you usually finish work?|Bạn thường tan làm lúc mấy giờ?
What time did you wake up?|Did you sleep well?|Bạn ngủ ngon không?
When are you going to pick up your friend?|Can you pick me up?|Bạn đến đón tôi được không?
Are you working today?|Are you off today?|Hôm nay bạn được nghỉ à?
Do you like your boss?|How was your first day?|Ngày đầu tiên của bạn thế nào?
I don't speak very well|I'm still learning English|Tôi vẫn đang học tiếng Anh
I don't want that|I'll think about it|Tôi sẽ suy nghĩ thêm
I like her|We get along well|Chúng tôi rất hợp nhau
I'm not married|Do you live alone?|Bạn sống một mình à?
I'll give you a call|Talk to you soon|Hẹn nói chuyện với bạn sau
Thank you, miss|Thanks anyway|Dù sao cũng cảm ơn bạn
Thank you, sir|I really appreciate it|Tôi rất trân trọng điều đó
They'll be right back|Let me know when you get there|Tới nơi thì báo tôi nhé
This is very important|That's a good point|Ý đó hay đấy
Very good, thanks|So far, so good|Đến giờ mọi chuyện vẫn ổn
We like it very much|We had a great time|Chúng tôi đã có khoảng thời gian rất vui
Would you take a message, please?|Sorry to keep you waiting|Xin lỗi đã để bạn đợi
You're beautiful|Good to see you|Rất vui được gặp bạn
Do you sell batteries?|Can I charge my phone here?|Tôi sạc điện thoại ở đây được không?
I'll have a glass of water, please|Could I get this to go?|Cho tôi phần này mang đi được không?
My watch has been stolen|I've lost my wallet|Tôi bị mất ví
do the trick|wake up|tỉnh giấc, đánh thức
get in touch|hang up|cúp máy, treo lên
find one's way|check in|làm thủ tục nhận phòng hoặc lên chuyến bay
find one's feet|check out|trả phòng, xem thử
stand in line|sit down|ngồi xuống
work for|log in|đăng nhập
work together|log out|đăng xuất
keep in mind|hang out|đi chơi, dành thời gian cùng nhau
keep on top of|join in|tham gia vào một hoạt động đang diễn ra
break even|try on|mặc thử, mang thử
break the news|come in|đi vào, mời vào
break the ice|come over|ghé qua nhà ai
read back|come across|tình cờ gặp hoặc tìm thấy
read out loud|come up with|nghĩ ra
turn out to be|eat out|ăn ở ngoài
pass for|throw away|vứt đi
pass around|put away|cất vào chỗ
pass on to|put on|mặc, đeo, bật thiết bị
carry off|put off|hoãn lại
carry through|put up with|chịu đựng
carry forward|put down|đặt xuống, chê bai
carry on with|run out of|dùng hết, cạn kiệt
fall into place|run into|tình cờ gặp, gặp phải
fall short|run away|chạy trốn
fall through the cracks|run over|cán qua, xem lại nhanh
send along|clean up|dọn dẹp
arrange for|tidy up|thu dọn cho gọn
arrange with|wash up|rửa bát hoặc rửa tay mặt tùy ngữ cảnh
agree on terms|heat up|hâm nóng, nóng lên
agree in principle|warm up|khởi động, làm ấm
blow down|cool down|nguội đi, bình tĩnh lại
blow out of proportion|calm down|bình tĩnh lại, làm ai bình tĩnh
catch out|slow down|chậm lại, giảm tốc
catch fire|speed up|tăng tốc, đẩy nhanh
catch sight of|hurry up|nhanh lên
fill with|show up|xuất hiện, có mặt
move through|show around|dẫn ai đi tham quan
move away from|help out|giúp một tay
move down|figure out|tìm ra cách, hiểu ra
play with|shop around|tham khảo nhiều nơi trước khi mua
play on words|plug in|cắm điện, cắm vào ổ hoặc cổng
pull for|sign up|đăng ký tham gia
push ahead|back up|sao lưu; lùi lại; hỗ trợ
push off|shut down|tắt hẳn, ngừng hoạt động
push on|switch on|bật thiết bị
push forward|switch off|tắt thiết bị
push in|sort out|sắp xếp, giải quyết
write for|speak up|nói to hơn, lên tiếng
write about|ask around|hỏi nhiều người
write to|mess up|làm hỏng, làm rối tung
write off as|end up|rốt cuộc làm gì hoặc ở đâu
do exercise|get some exercise|vận động, tập thể dục
offer an apology|send a message|gửi tin nhắn
high hopes|make friends|kết bạn""".splitlines())
)

FIRST_VERBS = """wake up|get up|sit down|stand up|come in|go out|come over|hang out|eat out|pick up|drop off|put on|take off|try on|turn on|turn off|hurry up|slow down|look for|find out|check in|check out|get on|get off|get in|get out|go back|get back|hold on|hang up|call back|look up|write down|fill out|log in|sign up|put away|clean up|throw away|run out of""".split("|")


def revise_course(records):
    found = {record["english"] for record in records}
    missing = (CORRECTIONS.keys() | REPLACEMENTS.keys()) - found
    if missing:
        raise ValueError(f"Cannot find original phrases: {sorted(missing)}")

    for index, record in enumerate(records, 1):
        old = record["english"]
        record["id"] = f"phrase-{index:04d}"
        if old in REPLACEMENTS:
            record["english"], record["vietnamese"] = REPLACEMENTS[old]
            record["source"] = {"document": "editorial"}
            record["id"] = f"phrase-{1000 + index:04d}"
        elif old in CORRECTIONS:
            record["english"], record["vietnamese"] = CORRECTIONS[old]

        if record["kind"] == "verb":
            meaning = record["vietnamese"].replace(" / ", "; ")
            record["vietnamese"] = meaning[0].lower() + meaning[1:]

    verb_ranks = {phrase: rank for rank, phrase in enumerate(FIRST_VERBS)}
    verb_phrases = {record["english"] for record in records if record["kind"] == "verb"}
    missing = verb_ranks.keys() - verb_phrases
    if missing:
        raise ValueError(f"Missing introductory verbs: {sorted(missing)}")

    start = next(i for i, record in enumerate(records) if record["kind"] == "verb")
    end = next(i for i, record in enumerate(records) if record["kind"] == "collocation")
    records[start:end] = sorted(
        records[start:end],
        key=lambda record: verb_ranks.get(record["english"], len(verb_ranks)),
    )

    seen = set()
    for record in records:
        phrase = record["english"]
        normalized = re.sub(r"[^\w\s]", "", phrase.casefold().replace("-", " "))
        normalized = " ".join(normalized.split())
        if normalized in seen:
            raise ValueError(f"Duplicate phrase: {phrase}")
        if len(normalized.split()) < 2 or not record["vietnamese"].strip():
            raise ValueError(f"Incomplete phrase: {record}")
        seen.add(normalized)


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('conversation', type=Path)
    parser.add_argument('phrasal', type=Path)
    parser.add_argument('--output', type=Path, default=Path('src/data/common-phrases.json'))
    args=parser.parse_args()
    conv=rows(args.conversation,3)
    phrasal=rows(args.phrasal,4)
    assert len(conv)==850 and len(phrasal)==740, 'Reference edition differs'
    conv_ids=[i for i in ids('2-5 7 8 10-13 15-25 27-30 33-35 37-40 42-45 49-51 53-55 57 58 62-67 69-77 79-81 83 88-90 93-95 97-99 103-109 118-125 126 128-130 133-140 143-145 147-151 153-154 156-171 172-173 197 200 202 208-223 224-226 229 230 232-234 236 238 239 242-248 250-253 255 258 260-267 269-271 273-276 279-281 283 285-294 295 297-304 306-308 310 312-318 320 321 323-325 327-332 334-340 343 344 346-349 351-353 355 357 362 364 365 368-369 371-375 377-381 383-385 387 388 391-407 410-414 416-418 420-423 425-429 432 433 435-442 444-447 451-459 461-479 480-484 487-489 491-492 494-496 499 501-515 517 519-524 526-541 543-545 548-551 553-556 560-562 564-567 569-577 579-580 583-589 594-598 600-609 610-614 619-623 626 630-642 644-648 651 653-654 657 658 661 662 664-667 669 671-675 680 682-687 689-691 693-695 697 698 701-702 704-706 708-714 716 718-723 725 729-735 737-740 742-751 753 755 757-763 765-768 771-774 776-778 780-784 786 788-805 808-817 820-825 827-831 833-844 849-850') if i not in ids('3 15 18 19 20 22 23 24 25 28 30 39 42 44 45 54 55 58 63 64 65 67 69 72 74 75 77 81 88 90 93 94 97 103 106 107 118 122 123 126 129 133 134 135 136 137 138 140 145 148 149 150 154 157 158 159 160 161 163 164 165 166 168 169 170 171 172 173 202 216 217 218 219 220 221 223 224 229 230 233 236 242 243 245 246 247 248 251 253 258 260 263 266 267 270 271 274 275 285 287 288 289 290 291 292 295 297 304')]
    phrasal_ids=[i for i in ids('1 2 3 6 19 20 21-38 40-53 55-59 61 65-67 70 74 80 81-84 88 89 95 99 101-106 108 109 113 114 121-129 131 132 138-144 146-149 151 156 157 161-177 180-189 193 195 198 199 201-206 208 214-216 218 219 221-228 230 231 234 235 237-247 256 259 261-268 270 272 275 277 278 281-286 289-291 295 298 301-304 307 308 319 321-332 335 338 341-349 351-353 359 361-369 371 373 378 381-386 388 398 400-408 410 412 413 420-426 428 429 435 436 439 440 461-466 478 481 482 501-503 509 510 521-524 526 530 532 536 540-544 547 551 556 558 561-563 581-584 591 601-605 607 614 621-630 633-635 638-644 648 649 651 657 661-672 675 676 679 681-692 694 701-703 711 721-729 734') if i not in ids('2 19 35 50 65 74 80 84 89 95 99 108 109 113 125 126 127 128 139 140 143 146 149 151 157 173 174 177 180 186 187 195 204 205 208 215 216 218 219 231 234 237 240 242 256 259 267 272 275 277 278 290 291 295 298 304')]
    swap={357:3,355:39,364:168,365:170,388:189,473:184,474:175,786:191,825:192,831:193,833:196,279:218}
    conv_ids=[swap.get(i,i) for i in conv_ids]
    conv_fixes=fixes("""2|Good afternoon|Chào buổi chiều
3|Good evening|Chào buổi tối
7|Happy birthday|Chúc mừng sinh nhật
8|Have a good trip|Chúc bạn có chuyến đi tốt đẹp
27|What time is checkout?|Mấy giờ trả phòng?
39|Do you take credit cards?|Bạn có nhận thẻ tín dụng không?
53|I'll have the same thing|Cho tôi món giống vậy
57|Is that OK?|Như vậy được không?
66|That's too expensive|Cái đó đắt quá
73|Which one is better?|Cái nào tốt hơn?
79|Here it is|Nó đây
80|Here you are|Của bạn đây
95|It's OK|Không sao đâu
124|Can I take a message?|Tôi có thể ghi lại lời nhắn không?
147|I'm OK|Tôi ổn
156|What's wrong?|Có chuyện gì vậy?
168|Can I have a receipt, please?|Cho tôi xin biên lai được không?
170|Can we have a menu, please?|Cho chúng tôi xin thực đơn được không?
175|Have you eaten yet?|Bạn ăn chưa?
184|I haven't finished eating|Tôi chưa ăn xong
189|I'd like a table near the window|Tôi muốn một bàn gần cửa sổ
191|I'll give you a call|Tôi sẽ gọi điện cho bạn
192|I'll have a cup of tea, please|Cho tôi một tách trà, xin cảm ơn
193|I'll have a glass of water, please|Cho tôi một ly nước, xin cảm ơn
196|I'm here on business|Tôi đến đây vì công việc
197|I'm sorry|Tôi xin lỗi
214|Is there a doctor who speaks English?|Có bác sĩ nào nói tiếng Anh không?
222|Would you like to go for a walk?|Bạn có muốn đi dạo không?
244|Can you repeat that, please?|Bạn có thể nhắc lại được không?
262|I want to ask you a question|Tôi muốn hỏi bạn một câu
269|I'm leaving tomorrow|Tôi sẽ rời đi ngày mai
273|One-way or round-trip?|Một chiều hay khứ hồi?
317|Do you study English?|Bạn có học tiếng Anh không?
334|I don't feel well|Tôi thấy không khỏe
335|My arm hurts|Tay tôi đau
343|I'm a size 8|Tôi mặc cỡ 8
346|I'm fine, and you?|Tôi khỏe, còn bạn?
369|This is my first time there|Đây là lần đầu tôi đến đó
377|What's your last name?|Họ của bạn là gì?
379|Where are the T-shirts?|Áo phông ở đâu?
391|Am I pronouncing it correctly?|Tôi phát âm đúng không?
401|Does anyone here speak English?|Có ai ở đây nói tiếng Anh không?
414|I don't understand what you're saying|Tôi không hiểu bạn đang nói gì
435|Can I have a glass of water, please?|Cho tôi một ly nước được không?
442|Fill it up, please|Làm ơn đổ đầy
477|Can I have the bill, please?|Cho tôi xin hóa đơn được không?
507|Is everything OK?|Mọi thứ ổn chứ?
517|Were there any problems?|Có vấn đề gì không?
524|What did you think?|Bạn nghĩ thế nào?
561|Do you think it'll rain today?|Bạn có nghĩ hôm nay trời sẽ mưa không?
580|What's the room rate?|Giá phòng bao nhiêu?
588|As soon as possible|Càng sớm càng tốt
600|Expiration date|Ngày hết hạn
608|How much altogether?|Tổng cộng bao nhiêu?
619|It's a quarter to seven|Bây giờ là bảy giờ kém mười lăm
635|What's today's date?|Hôm nay ngày mấy?
664|He's an engineer|Anh ấy là kỹ sư
665|He's very hardworking|Anh ấy rất chăm chỉ
671|I still have a lot of things to buy|Tôi vẫn còn nhiều thứ phải mua
682|When do you get off work?|Khi nào bạn tan làm?
686|Be careful driving|Lái xe cẩn thận
693|From time to time|Thỉnh thoảng
694|Good idea|Ý hay đấy
704|I've already eaten|Tôi ăn rồi
713|I don't want to bother you|Tôi không muốn làm phiền bạn
730|Please let me know if you need help|Hãy cho tôi biết nếu bạn cần giúp đỡ
741|I'm good, and you?|Tôi khỏe, còn bạn?
751|I'm very busy right now|Bây giờ tôi rất bận
758|Just a little|Chỉ một chút thôi
763|Let's practice English|Cùng luyện tiếng Anh nhé
768|No, thank you|Không, cảm ơn
776|Please fill out this form|Vui lòng điền mẫu này
791|Thank you, miss|Cảm ơn cô
792|Thank you, sir|Cảm ơn ông
798|That's all right|Không sao đâu
799|That's enough|Thế là đủ
805|That's too bad|Thật đáng tiếc
817|Would you take a message, please?|Bạn ghi lại lời nhắn giúp tôi được không?
830|I was in an accident|Tôi gặp tai nạn
839|It's very cold today|Hôm nay trời rất lạnh
842|I have a sore throat|Tôi bị đau họng""")
    p_fixes=fixes("""1|do away with|loại bỏ, bãi bỏ
3|do over|làm lại
6|do without|xoay xở mà không cần
20|do the trick|có tác dụng, giải quyết được vấn đề
21|get up|thức dậy, đứng dậy
26|get across|truyền đạt rõ ràng
31|get on|lên xe; tiến triển
37|get down|đi xuống; làm ai buồn
40|get in touch|liên lạc
55|go under|phá sản; chìm
56|go ahead|tiến hành; cứ làm đi
57|go through with|làm đến cùng
66|find one's way|tìm được đường
67|find one's feet|dần thích nghi
82|pick out|chọn ra
83|pick on|bắt nạt, kiếm chuyện với
102|set off|khởi hành; kích hoạt
104|set back|làm chậm tiến độ
114|set apart|làm khác biệt, nổi bật
124|stand for|đại diện cho; là viết tắt của
142|work on|làm việc để hoàn thiện
144|work through|giải quyết từng bước
147|work around|tìm cách khắc phục trở ngại
163|look up|tra cứu; nhìn lên
164|look forward to|mong chờ
166|look out|coi chừng
188|keep to|tuân thủ, bám sát
193|keep up with|theo kịp
198|keep in mind|ghi nhớ, lưu ý
199|keep on top of|nắm sát, kiểm soát
201|hold on|chờ một chút; bám chặt
214|hold on to|giữ chặt; giữ lại
221|break down|hỏng hóc; phân tích thành phần
223|break out|bùng phát
230|break in|đột nhập; chen lời
238|break the news|báo tin
239|break the ice|xóa bỏ sự ngượng ngùng ban đầu
243|call out|gọi lớn; chỉ trích công khai
245|call for|đòi hỏi, yêu cầu
247|call in|gọi ai đến giúp; gọi điện báo
262|bring about|gây ra, mang lại
266|bring forward|đưa ra; dời lên sớm
289|give up on|từ bỏ hy vọng vào
303|read up on|đọc để tìm hiểu kỹ về
319|read out loud|đọc thành tiếng
322|take up|bắt đầu một hoạt động; chiếm chỗ
325|take down|ghi lại; tháo xuống
328|take back|trả lại; rút lại lời nói
335|take it out on|trút giận lên ai
338|take someone aside|mời ai ra nói chuyện riêng
343|turn out|hóa ra; đến tham dự
351|turn away|từ chối cho vào; quay đi
353|turn out to be|hóa ra là
363|pass up|bỏ qua cơ hội
367|pass for|được xem nhầm là
373|pass off as|giả làm, đánh tráo thành
383|carry over|chuyển sang kỳ sau
388|carry forward|chuyển tiếp sang giai đoạn sau
398|get carried away|quá hào hứng, bị cuốn theo
410|cut into|cắt vào; làm giảm
420|be cut out for|có tố chất phù hợp với
421|fall apart|tan rã; suy sụp
425|fall through|không thành hiện thực
436|fall short|không đạt yêu cầu
439|fall back on|dựa vào khi cần
461|send out|gửi đi, phát đi
462|send off|gửi đi; tiễn ai
481|arrange for|sắp xếp để việc gì xảy ra
503|agree to|chấp thuận
509|agree on terms|thống nhất các điều khoản
524|blow off|lờ đi, bỏ qua
532|blow away|thổi bay; gây ấn tượng mạnh
541|catch up|bắt kịp
542|catch on|hiểu ra; trở nên phổ biến
547|catch up on|làm bù, cập nhật
558|catch sight of|thoáng nhìn thấy
562|deal out|phân phát, chia
581|drop off|đưa ai/đồ đến nơi; ngủ thiếp đi
601|fill in|điền thông tin; làm thay
602|fill out|điền đầy đủ biểu mẫu
607|fill someone in on|cập nhật thông tin cho ai
614|fill up on|ăn/uống nhiều đến no
624|move up|tiến lên; được thăng chức
639|move over|dịch sang bên để nhường chỗ
641|play along|hùa theo, làm như đồng tình
642|play up|gây rắc rối; làm nổi bật
651|play into|vô tình tạo lợi thế cho
657|play on words|chơi chữ
662|pull up|dừng xe; kéo lên
664|pull through|vượt qua khó khăn, hồi phục
669|pull off|thực hiện thành công
670|pull on|kéo mặc vào
671|pull in|đến bến hoặc trạm
679|pull out of|rút khỏi
682|push back|đẩy lùi; dời lịch
686|push through|thúc đẩy để hoàn thành hoặc thông qua
690|push around|bắt nạt, sai khiến
694|push up|đẩy lên; làm tăng
701|watch out|cẩn thận
702|watch over|trông nom
725|write off|xóa nợ; coi như mất
734|write off as|gạt bỏ vì cho là""")
    records=[]
    for kind,selected,source,overrides in [('conversation',conv_ids,conv,conv_fixes),('verb',phrasal_ids,phrasal,p_fixes)]:
        for i in selected:
            page,row=source[i-1]
            en,vi=overrides.get(i,(row[1],row[2]))
            if kind=='verb':
                en=en.lower()
            records.append(dict(english=clean(en).rstrip('.'),vietnamese=clean(vi),kind=kind,source={'document':kind,'page':page}))
    for line in """make a decision|đưa ra quyết định
make a mistake|mắc lỗi
make an effort|nỗ lực
make a plan|lập kế hoạch
make progress|đạt tiến bộ
make a difference|tạo ra sự khác biệt
make an appointment|đặt lịch hẹn
make a phone call|gọi điện thoại
make a promise|đưa ra lời hứa
make a suggestion|đưa ra đề xuất
take a break|nghỉ giải lao
take a shower|tắm vòi sen
take a seat|ngồi xuống
take a photo|chụp ảnh
take notes|ghi chú
take care of|chăm sóc
take a look|xem qua
take your time|cứ từ từ
take responsibility|chịu trách nhiệm
take part in|tham gia
have breakfast|ăn sáng
have lunch|ăn trưa
have dinner|ăn tối
have a rest|nghỉ ngơi
have a good time|có khoảng thời gian vui vẻ
have a conversation|trò chuyện
have a chance|có cơ hội
have trouble with|gặp khó khăn với
have a point|nói có lý
have something in common|có điểm chung
do homework|làm bài tập về nhà
do the dishes|rửa bát
do the laundry|giặt quần áo
do the shopping|đi mua sắm
do exercise|tập thể dục
do research|nghiên cứu
do business|kinh doanh
do your best|cố gắng hết sức
do someone a favor|giúp ai một việc
do well in|làm tốt trong
pay attention to|chú ý đến
pay the bill|thanh toán hóa đơn
pay in cash|trả bằng tiền mặt
pay by card|trả bằng thẻ
save money|tiết kiệm tiền
spend money on|chi tiền vào
save time|tiết kiệm thời gian
spend time with|dành thời gian cho ai
waste time|lãng phí thời gian
earn a living|kiếm sống
tell the truth|nói sự thật
tell a story|kể một câu chuyện
tell a lie|nói dối
tell the difference|phân biệt
say hello|chào hỏi
say goodbye|nói lời tạm biệt
say thank you|nói lời cảm ơn
ask a question|đặt câu hỏi
answer a question|trả lời câu hỏi
ask for help|nhờ giúp đỡ
give advice|đưa ra lời khuyên
give an example|đưa ra ví dụ
give someone a hand|giúp ai một tay
give a speech|phát biểu
give permission|cho phép
offer help|đề nghị giúp đỡ
offer an apology|đưa ra lời xin lỗi
keep a promise|giữ lời hứa
keep a secret|giữ bí mật
keep calm|giữ bình tĩnh
get ready|chuẩn bị sẵn sàng
get dressed|mặc quần áo
get married|kết hôn
get lost|bị lạc
get better|khá hơn
get worse|tệ hơn
get enough sleep|ngủ đủ giấc
get some rest|nghỉ ngơi một chút
get used to|quen với
get a job|tìm được việc làm
go shopping|đi mua sắm
go for a walk|đi dạo
go to bed|đi ngủ
go to work|đi làm
go on holiday|đi nghỉ
go online|lên mạng
go abroad|đi nước ngoài
go wrong|gặp trục trặc
go missing|bị mất tích
go by bus|đi bằng xe buýt
come home|về nhà
come true|trở thành hiện thực
come first|đứng đầu hoặc được ưu tiên
come to an agreement|đi đến thỏa thuận
come to mind|nảy ra trong đầu
catch a bus|đón xe buýt
catch a cold|bị cảm lạnh
catch a train|đón tàu
miss a flight|lỡ chuyến bay
miss a deadline|lỡ hạn chót
on time|đúng giờ
in time|kịp lúc
at the moment|lúc này
for a while|trong một thời gian ngắn
in advance|trước thời hạn
at least|ít nhất
at most|nhiều nhất
so far|cho đến nay
right away|ngay lập tức
once in a while|thỉnh thoảng
in fact|thực ra
in general|nói chung
in particular|cụ thể là
for example|ví dụ
as a result|do đó
on the other hand|mặt khác
in other words|nói cách khác
in addition|ngoài ra
according to|theo
instead of|thay vì
be interested in|quan tâm đến
be good at|giỏi về
be afraid of|sợ
be proud of|tự hào về
be worried about|lo lắng về
be responsible for|chịu trách nhiệm về
be familiar with|quen thuộc với
be available for|có thể tham gia hoặc có thời gian cho
be late for|đến muộn
be tired of|chán ngấy
book a ticket|đặt vé
book a room|đặt phòng
check the price|kiểm tra giá
place an order|đặt hàng
cancel an order|hủy đơn hàng
return an item|trả lại một món hàng
try on clothes|thử quần áo
pack a suitcase|xếp đồ vào va li
follow directions|làm theo chỉ dẫn
cross the street|băng qua đường
meet a deadline|hoàn thành đúng hạn
attend a meeting|tham dự cuộc họp
send an email|gửi email
write a report|viết báo cáo
solve a problem|giải quyết vấn đề
reach a goal|đạt mục tiêu
learn a language|học một ngôn ngữ
pass an exam|thi đỗ
fail an exam|thi trượt
apply for a job|ứng tuyển việc làm
strong coffee|cà phê đậm
heavy rain|mưa lớn
high hopes|nhiều hy vọng
deep sleep|giấc ngủ sâu
fast food|đồ ăn nhanh
fresh air|không khí trong lành
public transport|phương tiện giao thông công cộng
free time|thời gian rảnh
daily routine|thói quen hằng ngày
close friend|bạn thân""".splitlines():
        en,vi=line.split('|',1)
        records.append(dict(english=en,vietnamese=vi,kind='collocation',source={'document':'editorial'}))
    counts=Counter(r['kind'] for r in records)
    seen={}
    for r in records:
        k=key(r['english'])
        if k in seen:
            raise ValueError(f"Duplicate: {r['english']} / {seen[k]}")
        seen[k]=r['english']
        assert len(r['english'].split())>=2 and r['vietnamese'], r
    assert counts=={'conversation':520,'verb':320,'collocation':160}, counts
    assert len(seen)==1000
    priority=["Good morning","Good afternoon","Good evening","Nice to meet you","How are you?","I'm fine, and you?","Excuse me","I'm sorry","Thank you very much","Thanks for your help","Of course","No, thank you","See you later","See you tomorrow","Good luck","Have a good trip","Can you help me?","I don't understand","Can you repeat that, please?","Please speak more slowly"]
    rank={key(s):i for i,s in enumerate(priority)}
    records.sort(key=lambda r:(0 if r['kind']=='conversation' else 1 if r['kind']=='verb' else 2,rank.get(key(r['english']),len(priority))))
    revise_course(records)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    print(dict(counts),len(seen),args.output)

if __name__ == '__main__':
    main()
