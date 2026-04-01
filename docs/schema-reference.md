create table public.teacher_quizzes (
  teacher_quiz_id text not null,
  teacher_id text not null,
  title text not null,
  subject text null,
  preset text not null default 'EXAM'::text,
  duration_minutes integer not null default 0,
  shuffle_questions boolean not null default false,
  shuffle_options boolean not null default true,
  max_attempts integer not null default 1,
  show_review boolean not null default false,
  show_results boolean not null default true,
  results_release_policy text not null default 'MANUAL'::text,
  results_released boolean not null default false,
  results_released_at timestamp with time zone null,
  open_at timestamp with time zone null,
  close_at timestamp with time zone null,
  status text not null default 'DRAFT'::text,
  access_code text null,
  custom_fields_json jsonb not null default '{"fields": []}'::jsonb,
  draft_items_json jsonb not null default '{"items": []}'::jsonb,
  grading_policy text not null default 'BANDS_PCT'::text,
  grade_bands_json jsonb not null default '{"bands": []}'::jsonb,
  pass_threshold_pct numeric not null default 50,
  score_display_policy text not null default 'RAW_AND_PCT'::text,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint teacher_quizzes_pkey primary key (teacher_quiz_id),
  constraint teacher_quizzes_teacher_id_fkey foreign KEY (teacher_id) references users (user_id)
) TABLESPACE pg_default;

create index IF not exists teacher_quizzes_teacher_id_idx on public.teacher_quizzes using btree (teacher_id) TABLESPACE pg_default;

create index IF not exists teacher_quizzes_teacher_id_status_idx on public.teacher_quizzes using btree (teacher_id, status) TABLESPACE pg_default;


create table public.teacher_quiz_items (
  quiz_item_id text not null,
  teacher_quiz_id text not null,
  position integer not null,
  bank_item_id text null,
  snap_stem text not null,
  snap_option_a text null,
  snap_fb_a text null,
  snap_option_b text null,
  snap_fb_b text null,
  snap_option_c text null,
  snap_fb_c text null,
  snap_option_d text null,
  snap_fb_d text null,
  snap_option_e text null,
  snap_fb_e text null,
  snap_option_f text null,
  snap_fb_f text null,
  snap_correct text not null,
  snap_rationale text null,
  snap_rationale_img text null,
  snap_subject text null,
  snap_maintopic text null,
  snap_subtopic text null,
  snap_difficulty text null,
  snap_marks integer not null default 1,
  snap_question_type text not null default 'MCQ'::text,
  snap_shuffle_options boolean not null default true,
  snapped_at timestamp with time zone null default now(),
  constraint teacher_quiz_items_pkey primary key (quiz_item_id),
  constraint teacher_quiz_items_teacher_quiz_id_fkey foreign KEY (teacher_quiz_id) references teacher_quizzes (teacher_quiz_id)
) TABLESPACE pg_default;

create index IF not exists teacher_quiz_items_teacher_quiz_id_idx on public.teacher_quiz_items using btree (teacher_quiz_id) TABLESPACE pg_default;

create index IF not exists teacher_quiz_items_teacher_quiz_id_position_idx on public.teacher_quiz_items using btree (teacher_quiz_id, "position") TABLESPACE pg_default;


create table public.teacher_quiz_classes (
  tqc_id text not null,
  teacher_quiz_id text not null,
  class_id text not null,
  teacher_id text not null,
  status text not null default 'ACTIVE'::text,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint teacher_quiz_classes_pkey primary key (tqc_id),
  constraint unique_quiz_class unique (teacher_quiz_id, class_id),
  constraint teacher_quiz_classes_class_id_fkey foreign KEY (class_id) references teacher_classes (class_id),
  constraint teacher_quiz_classes_teacher_id_fkey foreign KEY (teacher_id) references users (user_id),
  constraint teacher_quiz_classes_teacher_quiz_id_fkey foreign KEY (teacher_quiz_id) references teacher_quizzes (teacher_quiz_id)
) TABLESPACE pg_default;

create index IF not exists teacher_quiz_classes_teacher_quiz_id_idx on public.teacher_quiz_classes using btree (teacher_quiz_id) TABLESPACE pg_default;

create index IF not exists teacher_quiz_classes_class_id_idx on public.teacher_quiz_classes using btree (class_id) TABLESPACE pg_default;

create index IF not exists teacher_quiz_classes_teacher_id_idx on public.teacher_quiz_classes using btree (teacher_id) TABLESPACE pg_default;

create table public.teacher_quiz_attempts (
  attempt_id text not null,
  user_id text not null,
  teacher_quiz_id text not null,
  teacher_id text not null,
  class_id text not null,
  attempt_no integer not null default 1,
  mode text not null,
  duration_minutes integer not null default 0,
  status text not null default 'IN_PROGRESS'::text,
  started_at timestamp with time zone null default now(),
  due_at timestamp with time zone null,
  submitted_at timestamp with time zone null,
  updated_at timestamp with time zone null default now(),
  items_json jsonb not null default '[]'::jsonb,
  answers_json jsonb not null default '{}'::jsonb,
  flags_json jsonb not null default '{}'::jsonb,
  candidate_fields_json jsonb not null default '{"fields": {}}'::jsonb,
  score_raw numeric null,
  score_total numeric null,
  score_pct numeric null,
  time_taken_s integer null,
  score_json jsonb null,
  grading_policy text null,
  grade_bands_json jsonb null,
  score_display_policy text null,
  constraint teacher_quiz_attempts_pkey primary key (attempt_id),
  constraint teacher_quiz_attempts_class_id_fkey foreign KEY (class_id) references teacher_classes (class_id),
  constraint teacher_quiz_attempts_teacher_id_fkey foreign KEY (teacher_id) references users (user_id),
  constraint teacher_quiz_attempts_teacher_quiz_id_fkey foreign KEY (teacher_quiz_id) references teacher_quizzes (teacher_quiz_id),
  constraint teacher_quiz_attempts_user_id_fkey foreign KEY (user_id) references users (user_id)
) TABLESPACE pg_default;

create index IF not exists teacher_quiz_attempts_user_id_idx on public.teacher_quiz_attempts using btree (user_id) TABLESPACE pg_default;

create index IF not exists teacher_quiz_attempts_teacher_quiz_id_idx on public.teacher_quiz_attempts using btree (teacher_quiz_id) TABLESPACE pg_default;

create index IF not exists teacher_quiz_attempts_teacher_id_idx on public.teacher_quiz_attempts using btree (teacher_id) TABLESPACE pg_default;

create index IF not exists teacher_quiz_attempts_class_id_idx on public.teacher_quiz_attempts using btree (class_id) TABLESPACE pg_default;

create index IF not exists teacher_quiz_attempts_user_id_teacher_quiz_id_idx on public.teacher_quiz_attempts using btree (user_id, teacher_quiz_id) TABLESPACE pg_default;

create index IF not exists teacher_quiz_attempts_status_idx on public.teacher_quiz_attempts using btree (status) TABLESPACE pg_default;

create table public.teacher_profiles (
  teacher_id text not null,
  display_name text null,
  email text null,
  phone_number text null,
  organisation text null,
  role_requested text null default 'TEACHER'::text,
  plan_type text not null default 'FREE'::text,
  active boolean not null default false,
  request_status text not null default 'PENDING'::text,
  request_note text null,
  request_count integer not null default 0,
  requested_at timestamp with time zone null,
  last_request_at timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint teacher_profiles_pkey primary key (teacher_id),
  constraint teacher_profiles_teacher_id_fkey foreign KEY (teacher_id) references users (user_id)
) TABLESPACE pg_default;

create table public.teacher_library_courses (
  course_id text not null,
  title text not null,
  program_scope text[] not null default '{}'::text[],
  status text not null default 'active'::text,
  sort_order integer not null default 0,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  items_table text null,
  constraint teacher_library_courses_pkey primary key (course_id)
) TABLESPACE pg_default;

create index IF not exists teacher_library_courses_status_idx on public.teacher_library_courses using btree (status) TABLESPACE pg_default;

create index IF not exists teacher_library_courses_sort_order_idx on public.teacher_library_courses using btree (sort_order) TABLESPACE pg_default;

create table public.teacher_classes (
  class_id text not null,
  teacher_id text not null,
  title text not null,
  join_code text not null,
  custom_fields_json jsonb not null default '{"fields": []}'::jsonb,
  status text not null default 'ACTIVE'::text,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint teacher_classes_pkey primary key (class_id),
  constraint teacher_classes_join_code_key unique (join_code),
  constraint teacher_classes_teacher_id_fkey foreign KEY (teacher_id) references users (user_id)
) TABLESPACE pg_default;

create index IF not exists teacher_classes_teacher_id_idx on public.teacher_classes using btree (teacher_id) TABLESPACE pg_default;

create index IF not exists teacher_classes_join_code_idx on public.teacher_classes using btree (join_code) TABLESPACE pg_default;


create table public.teacher_class_members (
  member_id text not null,
  class_id text not null,
  user_id text not null,
  teacher_id text not null,
  display_name text null,
  email text null,
  member_fields_json jsonb not null default '{"fields": {}}'::jsonb,
  status text not null default 'ACTIVE'::text,
  joined_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint teacher_class_members_pkey primary key (member_id),
  constraint unique_class_member unique (class_id, user_id),
  constraint teacher_class_members_class_id_fkey foreign KEY (class_id) references teacher_classes (class_id),
  constraint teacher_class_members_teacher_id_fkey foreign KEY (teacher_id) references users (user_id),
  constraint teacher_class_members_user_id_fkey foreign KEY (user_id) references users (user_id)
) TABLESPACE pg_default;

create index IF not exists teacher_class_members_class_id_idx on public.teacher_class_members using btree (class_id) TABLESPACE pg_default;

create index IF not exists teacher_class_members_user_id_idx on public.teacher_class_members using btree (user_id) TABLESPACE pg_default;

create index IF not exists teacher_class_members_teacher_id_idx on public.teacher_class_members using btree (teacher_id) TABLESPACE pg_default;

create table public.teacher_bank_items (
  bank_item_id text not null,
  teacher_id text not null,
  status text not null default 'ACTIVE'::text,
  question_type text not null default 'MCQ'::text,
  stem text not null,
  option_a text null,
  fb_a text null,
  option_b text null,
  fb_b text null,
  option_c text null,
  fb_c text null,
  option_d text null,
  fb_d text null,
  option_e text null,
  fb_e text null,
  option_f text null,
  fb_f text null,
  correct text not null,
  rationale text null,
  rationale_img text null,
  subject text null,
  maintopic text null,
  subtopic text null,
  difficulty text null,
  marks integer not null default 1,
  shuffle_options boolean not null default true,
  source_type text not null default 'TEACHER'::text,
  source_course_id text null,
  source_item_id text null,
  imported_at timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint teacher_bank_items_pkey primary key (bank_item_id),
  constraint teacher_bank_items_teacher_id_fkey foreign KEY (teacher_id) references users (user_id)
) TABLESPACE pg_default;

create index IF not exists teacher_bank_items_teacher_id_idx on public.teacher_bank_items using btree (teacher_id) TABLESPACE pg_default;

create index IF not exists teacher_bank_items_teacher_id_status_idx on public.teacher_bank_items using btree (teacher_id, status) TABLESPACE pg_default;

create index IF not exists teacher_bank_items_maintopic_idx on public.teacher_bank_items using btree (maintopic) TABLESPACE pg_default;

create index IF not exists teacher_bank_items_source_type_idx on public.teacher_bank_items using btree (source_type) TABLESPACE pg_default;






