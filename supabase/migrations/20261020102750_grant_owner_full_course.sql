-- Grant beta owner access and full course access to gwaporon311@gmail.com
insert into private.beta_owner_emails (email)
values ('gwaporon311@gmail.com')
on conflict (email) do nothing;

insert into private.full_course_access_emails (email)
values ('gwaporon311@gmail.com')
on conflict (email) do nothing;
