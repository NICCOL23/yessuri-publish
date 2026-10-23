-- Expand question field values only; preserve every existing row and permission.
begin;
alter table public.board_questions drop constraint board_questions_group_id_check;
alter table public.board_questions add constraint board_questions_group_id_check check (group_id in ('general','electric','water','life','computer','unknown','욕실·설비','도배','장판','싱크대·붙박이장','보일러','누수·수도','하수구·변기','타일','페인트','목공','청소','이사','철거','전기·조명','문·창호','에어컨','CCTV 설치','TV·LED 모니터 수리','컴퓨터·IT'));
commit;
