-- SOLO DEMO. 7 clubes y 10 usuarios ficticios por club.
-- Primero aplicar registro_migration.sql y clubes_logos_migration.sql.
-- Los archivos PNG/JPG suministrados están en frontend/public/club-logos.
-- Emails: ferro.socio01@demo.example.com ... hacoaj.socio10@demo.example.com
-- Clave compartida de DEMO: ComuniDemo2026!
-- Repetible: no resetea contraseñas, no modifica aprobaciones ni asigna administradores.
BEGIN;
LOCK TABLE public."Comunidad", public."Usuario", public."ComunidadUsuario" IN SHARE ROW EXCLUSIVE MODE;
CREATE TEMP TABLE demo_clubes (slug text PRIMARY KEY,nombre text,logo text,aliases text[]) ON COMMIT DROP;
INSERT INTO demo_clubes VALUES
('ferro', 'Ferro Carril Oeste', '/club-logos/ferro.jpg', ARRAY['ferro carril oeste', 'ferro', 'club ferro carril oeste']::text[]),
('cissab', 'CISSAB', '/club-logos/cissab.png', ARRAY['cissab']::text[]),
('boca-juniors', 'Boca Juniors', '/club-logos/boca-juniors.png', ARRAY['boca juniors', 'club atlético boca juniors', 'club atletico boca juniors']::text[]),
('hebraica', 'Sociedad Hebraica Argentina', '/club-logos/hebraica.png', ARRAY['sociedad hebraica argentina', 'hebraica', 'sha']::text[]),
('river-plate', 'River Plate', '/club-logos/river-plate.png', ARRAY['river plate', 'club atlético river plate', 'club atletico river plate']::text[]),
('macabi', 'Macabi', '/club-logos/macabi.jpg', ARRAY['macabi', 'club macabi', 'macabi buenos aires']::text[]),
('hacoaj', 'Club Náutico Hacoaj', '/club-logos/hacoaj.png', ARRAY['club náutico hacoaj', 'club nautico hacoaj', 'hacoaj']::text[]);
CREATE TEMP TABLE demo_socios (slug text,nombre text,mail text,telefono bigint,socio bigint,hash text) ON COMMIT DROP;
INSERT INTO demo_socios VALUES
('ferro', 'Ana', 'ferro.socio01@demo.example.com', 12025550100, 900001, 'scrypt$32768$8$1$43fa46e8fa13a1448822885dfae6bca6$1a503a539441d791024bf0a82bf09a1b8fdd1dd4e2e9ac9458416e7297553c6f006868464859b7da3f6a25898988433b7d7e0046220ec5bd3cf80cfde8be2f27'),
('ferro', 'Bruno', 'ferro.socio02@demo.example.com', 12025550101, 900002, 'scrypt$32768$8$1$afc898b9ee0da9ff2cfc6445a5347e09$eeb2ee93158b3c28e59da77335efa268c6167bbf044ac49738e8cca4ec7e42da371e5264b197a189ebab65fdea2639fe71f3ffd87de1b76ec2bd626c7388f8eb'),
('ferro', 'Carla', 'ferro.socio03@demo.example.com', 12025550102, 900003, 'scrypt$32768$8$1$e2734d768dcda285d1be5f703809a2c6$fb97da870d99c5d88f8aac1d9e1d0d313c88447f40d617e58a908d07dd09a6d6c7655af0eec879bcb1b3b4bd5583494598af7e9588fa394742a38f01d4e8ccb7'),
('ferro', 'Diego', 'ferro.socio04@demo.example.com', 12025550103, 900004, 'scrypt$32768$8$1$10f59ee67c650e98e3d674e199d7c7b1$e421d1e58a081bc02b91f2dc973eefc309101843effd592ac390eab656e42c3ef1bf658e1310e164cfd94d83cfd9767ce3ca5cbfbce721ffa7c36e550887a6ab'),
('ferro', 'Elena', 'ferro.socio05@demo.example.com', 12025550104, 900005, 'scrypt$32768$8$1$7d5292056c42967c5fadf7eb6f756dc6$553ea2628d24f447cc9195f314b2777ef223bb2e154d0cf1c6b17b48219e540e6323320d7e5b792a273212b78c51e05a58446db2633a4720e8da02d7c7a2b4a0'),
('ferro', 'Federico', 'ferro.socio06@demo.example.com', 12025550105, 900006, 'scrypt$32768$8$1$7b4f8aea6c78e619794b977e99788b75$f4790150932b9ae821429fd7eb29181e0720d6742bac8475037edba00357e453e52260434fec5ac47643be2ff33be4558fda23155620918eeb0dc004b5928ed8'),
('ferro', 'Gabriela', 'ferro.socio07@demo.example.com', 12025550106, 900007, 'scrypt$32768$8$1$2564f347664154aa4d657b6ea43b77d9$8f472004decc973c44426c96a4eb96c9a021f19e9ffdd7609b009e1a1286dd460f4f02e26e2ba057facbb2c601a5afeda0e63c06a305ff902fe26a6fa0e87992'),
('ferro', 'Hugo', 'ferro.socio08@demo.example.com', 12025550107, 900008, 'scrypt$32768$8$1$3e5a21703d4048ade54b938415625550$764504247d490f27c17a2742db30c68608128f0c48f0ce190044cdde485b2d26ce272575d46963684ea44d199f914828d0901c0fc0b7d7abae8698cef0cfec83'),
('ferro', 'Inés', 'ferro.socio09@demo.example.com', 12025550108, 900009, 'scrypt$32768$8$1$f96d49822a27d10575fd38b3c396dd8a$d60459f827a3567041b984e3199147b3e8e58b92b38e9252e4115e77b7267638abcf9ab11eb73c75630b7ae1a3727320b7e506ba2d8a54185f30daf78f63ce1c'),
('ferro', 'Julián', 'ferro.socio10@demo.example.com', 12025550109, 900010, 'scrypt$32768$8$1$bc7f62fd09006b29b57e15fd00cb6005$aeb9535ba398e03fb0327b3318978c9df433e3f4f9b1deb881c25788bf049e4812d99636c0e5a77542d48ef16cdbfab07c73a05b34c66e629bb975a1e8ec85e9'),
('cissab', 'Ana', 'cissab.socio01@demo.example.com', 12025550110, 900101, 'scrypt$32768$8$1$9b837f0d49dba01ac608a695137b0567$38d57ac2ad44aa6e3480225bc5b9b001ef2b1ea3b38f6aea2f7929e882995b0538890c3e23aaa04601626fa368242da4467373cf4ae5921aab5cff41f0ba6290'),
('cissab', 'Bruno', 'cissab.socio02@demo.example.com', 12025550111, 900102, 'scrypt$32768$8$1$f0083bceba02f5af1e3e596ce9d58c65$f531e1ad3194c8a1c1f0b5d057bd71aeebaef18e69a4a52cf1f9f02466718078110cc5e427085c5924eefa4a88268399d3510dd2fe511d68b55a3434c842611f'),
('cissab', 'Carla', 'cissab.socio03@demo.example.com', 12025550112, 900103, 'scrypt$32768$8$1$e52543abe935a7140dbdbc79a9203d7a$4a0f62b1b11ed0c7d98b9c9a549885d3dd4991f11f8249dc8fc935ff8199df6969ff032cd020ad0fa0e77d94cc8fd321cfeeba5a390591cdbe6bfd8cb1785fb6'),
('cissab', 'Diego', 'cissab.socio04@demo.example.com', 12025550113, 900104, 'scrypt$32768$8$1$0a17b0598f33122cdfbe97c7c27b22f3$6ec857844d042160e5d47a9acac0001dab8150d779bbb1e53f62a873aa0e51b056997f4295af5af459c2aadf30728ec311d34fba66df9eb098d0fd3d14ddebf8'),
('cissab', 'Elena', 'cissab.socio05@demo.example.com', 12025550114, 900105, 'scrypt$32768$8$1$ac5e9856aaa6caab9433b1b78cc10fb7$af789e813a7eeb8be8dbf6ac2a015014e7b3b05015afe5d33e0a4fed3a2ac777bcf818a281a01444dcd710d8b06d0528d07bdca3aa8a946f39d84073c550b825'),
('cissab', 'Federico', 'cissab.socio06@demo.example.com', 12025550115, 900106, 'scrypt$32768$8$1$7421984ba753448879de6b1cc1a2e4f6$057fdaef59eb986623b06740ef0787fe9564a4c23750db5401318c240de1dc474e22aafe23beede311c4d4f7456e7386cd2cc258f3870368be0d1b7233689d71'),
('cissab', 'Gabriela', 'cissab.socio07@demo.example.com', 12025550116, 900107, 'scrypt$32768$8$1$2a84e1b71aa893a8bd16bdd1e9b25387$d648e74d95d074560d73c96af3275f3f4a347d8928b374212ff179fb427a1981f1b6decd14da202462bab14c00e212d816a2feff07f8cd2fee83601b69ef0cb8'),
('cissab', 'Hugo', 'cissab.socio08@demo.example.com', 12025550117, 900108, 'scrypt$32768$8$1$eff976e5cc71ddad62e5d6289cedc609$634aa161a74600fd66fa7455905abc18662aeacda688584a830d049c5ce2e039e0dd1a7725474c30bf167ea8eb646904e8551cd65c459f02b68faeaaf700f5ab'),
('cissab', 'Inés', 'cissab.socio09@demo.example.com', 12025550118, 900109, 'scrypt$32768$8$1$96f039898cc9c262f1261a5091ee82b1$bbd386933f075eca379715ef14f64bb21024c665e6f38968be18dd813d5f180573be6290e8275c289d05538b5f6bd027e1fde960e9e41be2c6dc51c064fec590'),
('cissab', 'Julián', 'cissab.socio10@demo.example.com', 12025550119, 900110, 'scrypt$32768$8$1$13b6c0aacd9f48bc0bd0af00033ae388$f96212f4d88e28b0a6cc8efe22e6e45fae20121682e4e6387d313e4539aa9d12311d13f50b0ebd81158b9492dd87cdd5584e9241e913bc00dbdf114b6f84bf9a'),
('boca-juniors', 'Ana', 'boca-juniors.socio01@demo.example.com', 12025550120, 900201, 'scrypt$32768$8$1$16fccb531ba04a72e247f9f083cd5bb9$b5fd70bf5a75f394380202255ebab3e8d7ff053da9a55f463fa05f698e393e4a5ca31f12bba45755c437fc575e24a4ab1be874718daaa0036411cddb87a939d2'),
('boca-juniors', 'Bruno', 'boca-juniors.socio02@demo.example.com', 12025550121, 900202, 'scrypt$32768$8$1$cd85547e64b7b36732150d06cb7bb550$57d8cf9d221135b64125a15fe3892ce171723c93f9ab5efaa7c74eef4e12b1c4427c7fa5b49ebc8d5f4b7974850caac77a9df1590b17578213af29abdea7665d'),
('boca-juniors', 'Carla', 'boca-juniors.socio03@demo.example.com', 12025550122, 900203, 'scrypt$32768$8$1$bab9681736ff110bd5b32006f2e5654c$57c0536fdf0e3e5b730ddb11afcefa32ca1bca2ad203354b8149d703fbf5ebe7cb656095840f7ae6296f1421eaaaa8c8fdf0ab6365304db813b4c6eb4b8a97f7'),
('boca-juniors', 'Diego', 'boca-juniors.socio04@demo.example.com', 12025550123, 900204, 'scrypt$32768$8$1$02580e9f99d85c30d57ec97063d4b13c$afd014cadd39c269f2aca5370329521df8fba378de6847759eafd40a8bbad1d0a37d693546b4d9455ae6808d2c846ec7f0ec673d07af426dd84f94b1a3979047'),
('boca-juniors', 'Elena', 'boca-juniors.socio05@demo.example.com', 12025550124, 900205, 'scrypt$32768$8$1$5bd107d295858d4028e9e0d3537369d0$88886fe1aa9189b5fd35ecd4b993d647484fd0622539b250e181b66a4c17235f74d5872b8c1176a32beef8ef937280dbee898f31568521c63ad4b7eb2c1c1ce1'),
('boca-juniors', 'Federico', 'boca-juniors.socio06@demo.example.com', 12025550125, 900206, 'scrypt$32768$8$1$5fa3e743cda98d65bbfc1f78ae98fc51$951a622e452651e9fc89ab159c183f8641a0e1670b0a5645a44b03d32257455dbd0bd40ec6b1c9b4bb8ca82c1a04304e3f9fcf149feffc93d7b1ee3889e1dfef'),
('boca-juniors', 'Gabriela', 'boca-juniors.socio07@demo.example.com', 12025550126, 900207, 'scrypt$32768$8$1$e9fd877ded9a6700453040aac92df2d2$a76c5b8824115b5432a492ef95d8af8f0459c0a01d44895ff69e8c103f6848ca251dbf203c67f536499d3b5df11b0e6058ea669f9d84b987b97317cc84c32423'),
('boca-juniors', 'Hugo', 'boca-juniors.socio08@demo.example.com', 12025550127, 900208, 'scrypt$32768$8$1$55a36b951ee7831a105fb4d975ca1c12$46036ee158c488f785480297e206b5960a221904f665fd616d2ba03ca2175d645e95d97f9e2390088cc23ae92b134f6d3c29b17a4504e3f3cc4842f6be8beb87'),
('boca-juniors', 'Inés', 'boca-juniors.socio09@demo.example.com', 12025550128, 900209, 'scrypt$32768$8$1$1e64490681ce8a99fddd60cc64de0dd5$2d9169f6b2b8ed4298a0d033f77129274a4f8b0db234c8ef0c2512e65f53aa5168893dee85df5c55c5eaee915c10ac8d57d9a6896fd9957ea52eb174967d587c'),
('boca-juniors', 'Julián', 'boca-juniors.socio10@demo.example.com', 12025550129, 900210, 'scrypt$32768$8$1$57b40a9219a65cbec5dc892db9df4c57$c9d3f9795de28337991a3627bd71cdbdb286a3153f6f4893ee31540de1476ee05dce4a660cbaaf8f062bc6c5651cae3559ff994d57d3619630c4a34f95cb5d00'),
('hebraica', 'Ana', 'hebraica.socio01@demo.example.com', 12025550130, 900301, 'scrypt$32768$8$1$11ca1923a8e0336c01ea56a18351e894$9053027082a2fedfcff2241a715a8f279f475c0af8793e846d02ba7d67d46fc7293df93d950ea9d84b27849b02682d38a3411b24c1b53d41a2dd2c2515c57c52'),
('hebraica', 'Bruno', 'hebraica.socio02@demo.example.com', 12025550131, 900302, 'scrypt$32768$8$1$57e3820dcda1995f1ecd869572510620$52ac6ff008467b777d506471b3d5a2dd6a9eaeaf32fe8754b5cbb4a38bf0296c0f30aa8dcf3022900cecdd831123850cff60db05142f591461e1af6f67560fbd'),
('hebraica', 'Carla', 'hebraica.socio03@demo.example.com', 12025550132, 900303, 'scrypt$32768$8$1$eb992bbaf9529e252d1312257c00697e$f8f2338b68e28870e637f7f274d0e2f1b744943d6629ae876da2ccd78c1c867338528086a931c31efcfb86acc39166fe08a30a0ebad173a8bac03c05f1b299f3'),
('hebraica', 'Diego', 'hebraica.socio04@demo.example.com', 12025550133, 900304, 'scrypt$32768$8$1$0a92c4fd87e2fac2287a975e82140be2$dada07ad0888f772ffe9ad893586424d95826518cbf3ab638ee478cc476768cc7db5f1bdcf344fc3835f487004b3865c2eb177431b6d6c59c95dead435fbbd8f'),
('hebraica', 'Elena', 'hebraica.socio05@demo.example.com', 12025550134, 900305, 'scrypt$32768$8$1$eadd5db7ad39629170255af75ebd9487$0138ef43a33e596160c6ef4abcd9d7be8e7ec827aad1482fdee11f71771284b458957700d974e9a11fe7a35937bff0ce8d1fcecb2b1d558465d56495105a2eee'),
('hebraica', 'Federico', 'hebraica.socio06@demo.example.com', 12025550135, 900306, 'scrypt$32768$8$1$0ddd48023b413676e02460a3754a1ed0$39d5b48cdc492c23306c9cdc4e04da5856313bbb072b1ef17e0ab549b2540c4f093c52b342b9382f8ae59618a56fbba87a6cf072a4605f6ffb53b0f36256bdfa'),
('hebraica', 'Gabriela', 'hebraica.socio07@demo.example.com', 12025550136, 900307, 'scrypt$32768$8$1$e3f95bddfc314b0df9481e43e0bfed2e$6acf30960532f14b4d8aa1ec8289020b347cb611d7d8ffba387256df3c2783b3786abd0f8a9228f1d26335fb29174075a0789f43545139b28e6b94254787f5ac'),
('hebraica', 'Hugo', 'hebraica.socio08@demo.example.com', 12025550137, 900308, 'scrypt$32768$8$1$87701a13f9be02bb242ee74239ae9964$29abd0b5ae770b48a9d4c43f7572fa14a21290cac2b30b7988081cf5db230e5ee8ff6e7c5debc9288a749d6dd06c79ac4383004211d2fe3778f8bbe9bbea4e7b'),
('hebraica', 'Inés', 'hebraica.socio09@demo.example.com', 12025550138, 900309, 'scrypt$32768$8$1$7b550b6a30064f07b13180f6e1e33ea1$e9919f5c2147c242858ca299ea0a433ba911e2bedc747c6684b9efba5b23ca3a8e958e82f6e0c71faa9970f3aa65d826ec2c887f090393f85791266fac68f36e'),
('hebraica', 'Julián', 'hebraica.socio10@demo.example.com', 12025550139, 900310, 'scrypt$32768$8$1$c764662230ae84ef43289703f069165b$7cbf8af013c626b0d27121c3050901b8b197d60c1bdd18457fd4b98f1ffaa7b8b9d3b48a3cf42ad395de1ec38650205f73627ca33859342c2c16ff133b6cb07b'),
('river-plate', 'Ana', 'river-plate.socio01@demo.example.com', 12025550140, 900401, 'scrypt$32768$8$1$2ab910cd5e2a0cb8f85eb7bb8545d6e1$51ce888373a2c2c2cad59ec6a5a8f54539fee544b42f375469f2b4fcd043df4c2bddd3746f1074df0e4f3afc05ac522a96ed650f64b2b0689196102a11113969'),
('river-plate', 'Bruno', 'river-plate.socio02@demo.example.com', 12025550141, 900402, 'scrypt$32768$8$1$d6ae3cb23ceb3218c947562e6f39d953$31a59f5eb278ce5004736e8e37b3686a2b3da458cc2692baadaf43a8586e02a61c2eec9bca990c6a36620eaa1b3c06e01a413faf6c1d62fdff9ee4d6755802dc'),
('river-plate', 'Carla', 'river-plate.socio03@demo.example.com', 12025550142, 900403, 'scrypt$32768$8$1$386858131f2d107caf6a2d094b43e090$e6e4c03f3e7f316e4d1f010318f42af4201fdedd422d87edd969caed7bf742a968183561c7eab4848c12d8209382389ae6a89e0def9d98a47969a0622f898a11'),
('river-plate', 'Diego', 'river-plate.socio04@demo.example.com', 12025550143, 900404, 'scrypt$32768$8$1$568973a0828283a7f1300b4043d33029$bde6aaabd4a278ff3d6ab706d0deeb8670dd5b50fcfaabae6c4fd8f4a068eefff0b60187a6230a2158e4fc907b59b1f28ff3fc47569dc0a3d3024a3940dc42e5'),
('river-plate', 'Elena', 'river-plate.socio05@demo.example.com', 12025550144, 900405, 'scrypt$32768$8$1$6130e55c3d900bc7c72f38f392e18ba5$93242247b8f466767d299410161b4e869473b1e0c6c20d7e694446e889f0caa9303a6b8d382a4751d15d66f1a4d56e3c50a870ff162408385e82b461f8f18731'),
('river-plate', 'Federico', 'river-plate.socio06@demo.example.com', 12025550145, 900406, 'scrypt$32768$8$1$b88439aa88eb5ca33721a43fde7777e0$60bf8eaaaf18e9a5eb9a96175410507010584a3c897450bfd8383641511050dc66231bd8482caa419006447c0242fd7a012ef59339b48ffd230c9a59560813af'),
('river-plate', 'Gabriela', 'river-plate.socio07@demo.example.com', 12025550146, 900407, 'scrypt$32768$8$1$8721b4150008717e3967982c42681f05$19a9042e428a4b85e094fd5f26ca32def97ea3c131cbdcc0d8ee6cd7965715da9257497d422faa02c0a54ff7a0664dd44d02768752a3ef9a4a7c9ef17c475b65'),
('river-plate', 'Hugo', 'river-plate.socio08@demo.example.com', 12025550147, 900408, 'scrypt$32768$8$1$331359f630012ed0955615503a383653$2c80d468268a77a26ebf372db85f8513ef85644f0d25f24b0d2da7da9b9098717e899ed3aafe10a3220cc06142b683592d3430cacf0b22c688c0c314ed54d7d7'),
('river-plate', 'Inés', 'river-plate.socio09@demo.example.com', 12025550148, 900409, 'scrypt$32768$8$1$fe2aa931d2cd5c10f28a123a4061e2e3$070cbfddf79669be1012c36f32dba80f83f1b8f7abd573c787d23adbee3b974347edbff41f4922befc0f3d43ae4040ebd09e538d5eb95cce4398243ad8af2195'),
('river-plate', 'Julián', 'river-plate.socio10@demo.example.com', 12025550149, 900410, 'scrypt$32768$8$1$035b8a4063fc026446ea04052273f896$b997ade288ee49eb1317e3212681b25d1fd0530e201165a1026bcc6476ed74d7329ff97111eed8957d2eafbe343b3095d8fd2064c24fd0ac936bf42f4d11e84d'),
('macabi', 'Ana', 'macabi.socio01@demo.example.com', 12025550150, 900501, 'scrypt$32768$8$1$d2163726cf26b51d4bc6ec10767e3916$9f7113cad38225294b4900ec45189e3edc1d388c670d8ea92ec2f84486fa31d423579e0cef5363d41d94ffe93445ce3ac14dd3537872664e807c642e81e16490'),
('macabi', 'Bruno', 'macabi.socio02@demo.example.com', 12025550151, 900502, 'scrypt$32768$8$1$68d7c9311d6b3ef333cde2652aa9ab6a$3823c1058e80077e8cc4551e2c0157002ae60e18aa6ee5b4ed8b96f1e41b5879a9c65076051baf1e7500657671a232e801f44368051e66b1652ce8de65565910'),
('macabi', 'Carla', 'macabi.socio03@demo.example.com', 12025550152, 900503, 'scrypt$32768$8$1$7315c93a5caf40d1c1f455d59abaab22$b98b72044c77344ad32811fc5944213df575f26d01d3ddf1977d1cbd007fc614fba46438bfdbedc1d014e6e0e78483a37b67c98f2bc8a1c42fdfe88f1792f943'),
('macabi', 'Diego', 'macabi.socio04@demo.example.com', 12025550153, 900504, 'scrypt$32768$8$1$417a4770874283ec36209b03a0667528$6c4ef56abb2dd33ec94064f7e71cf1b42fa486d763ffa0e53152f39b3f35cf9abd2dccb49a26fd2fa39ba87029ad6e422f8efe95875ab3394d2f96beede95189'),
('macabi', 'Elena', 'macabi.socio05@demo.example.com', 12025550154, 900505, 'scrypt$32768$8$1$58d297cd4afb2c990ecd9513b495547a$5ba13b5d93a770d8f0dcae8210e4f3f29160f47059b062812c9f1dbc3b83baa5c9a7221a94b7f85061d3a2166bbe61c350f2bc410e98eaecbc8d3caa623f7b19'),
('macabi', 'Federico', 'macabi.socio06@demo.example.com', 12025550155, 900506, 'scrypt$32768$8$1$0329210106fb3f74725d5560d213dfd2$911aca30418423e07bb3194fabc4846f23c5a90ea7105ca2eb19aef2f873049c23ff2958d3504a93fae3eb6c6a4b9174030cd77ebfb3fd4d50abb41cf2dde619'),
('macabi', 'Gabriela', 'macabi.socio07@demo.example.com', 12025550156, 900507, 'scrypt$32768$8$1$68cd1e69e10f9e49c1f2c074661f34bf$dc58ce64057889b0123f4fd5aaff256655aed3ef8dc86c8a8e1056f61b5157b907a451af53aa87e47dcb30c66a8ba233cf8cb8788e790f15e7002d5a462b9ce4'),
('macabi', 'Hugo', 'macabi.socio08@demo.example.com', 12025550157, 900508, 'scrypt$32768$8$1$69005cfdedfaef0196243a8ee35cd79d$486e9d9b30d58010db7d64a441da7ec7e3edb8bdd3b4b98b232c2c51dd529f341cccbd76796654512ad03786e15b0dd0bd7f7ac8682353d4a4e50a09a362b1dd'),
('macabi', 'Inés', 'macabi.socio09@demo.example.com', 12025550158, 900509, 'scrypt$32768$8$1$250f06395f791640bd224b68cfbd61ea$45fcb7abc2264cfdf0a8b85eaa282c824ebbee0d1caaafe66923839451613ff7214b890e563d0a719beb3d966088fb1bca9fe520c15d2a71cb327ce3cbec9a50'),
('macabi', 'Julián', 'macabi.socio10@demo.example.com', 12025550159, 900510, 'scrypt$32768$8$1$6700cd1ccdbf557ac3e763725f3b53cf$33b3adfe72c2bf9da1796dde080e0910b09c7af20097c9d22afe77a073b59aa3961a358f4613a8824ffef987d2a49caec14aab14465b2424a79a0289e7c2508a'),
('hacoaj', 'Ana', 'hacoaj.socio01@demo.example.com', 12025550160, 900601, 'scrypt$32768$8$1$cfd3258db46d808862b017bbb433360a$5cc75ff34c6a31169ff11cd16a6374df222a7312b79eaa1493f95d6a1bf983afc03745e4f95f85f8ea45fb8af0243fb28cd271a90c8673602001ae47b07c1f9d'),
('hacoaj', 'Bruno', 'hacoaj.socio02@demo.example.com', 12025550161, 900602, 'scrypt$32768$8$1$456b8ea440a9b6152e0f3524f94ced9b$70bf9292c50d47dc84a871bad35f23a00307652b6aa1ac267d661eaeb01f3dea6c90e540590894f8c9b42e5d0ad8557a8cc49a5aee487d4c5c69dafd13f4ce4e'),
('hacoaj', 'Carla', 'hacoaj.socio03@demo.example.com', 12025550162, 900603, 'scrypt$32768$8$1$8e89c06ec360575a6a1aa8053c6fb5f7$ac64f29cd3db4ecca8092ddf7049e6f501f411694cc90300977cd9f2f00717ff96c9a33dc61219989625495f90a1271e9508ebe806b313e0cb1c2becff435fc1'),
('hacoaj', 'Diego', 'hacoaj.socio04@demo.example.com', 12025550163, 900604, 'scrypt$32768$8$1$359ff3c77a5bc1e362daf4d60cd51e2c$08102214c889f89b2b027c73729a3564a8bb38056f7c154ee7caa72c15c0602c4a8d50699ad9e43efbca5e28c091f80f3f85a732da84c488a2b5aadf82e27f5b'),
('hacoaj', 'Elena', 'hacoaj.socio05@demo.example.com', 12025550164, 900605, 'scrypt$32768$8$1$3e66ffee15dc7894f66502e56cf25cd6$7e979a6c7a5de71259a00a8d70cacb5f4235a206d7a920141ce4470ad9063de7314df77cb98734550c820ceee676b52f63b45256f834e0bea9469cda9b49afdb'),
('hacoaj', 'Federico', 'hacoaj.socio06@demo.example.com', 12025550165, 900606, 'scrypt$32768$8$1$085b29208aa70e1230f9b7d6059a0801$9109d58e8ec8b932b243012f720039e579e5f673fe87266eb524dd2f4fce6d9f97193ba6b07f30e35662d4809435006b8eb6dfd68a52b661b61c87506bf0ae79'),
('hacoaj', 'Gabriela', 'hacoaj.socio07@demo.example.com', 12025550166, 900607, 'scrypt$32768$8$1$ab5cbc9eccb4481d095551666bded0fa$3985bdd3e315290c1e9f2c6ddc457286463b07e184fe05873cf73072e3b2d654d9a2ac9c70be6695b1478370f39531cf193d307f331a71d2295c38bffc74cb27'),
('hacoaj', 'Hugo', 'hacoaj.socio08@demo.example.com', 12025550167, 900608, 'scrypt$32768$8$1$1f45dc39b855443ddadf9c6eaf19aa7c$61c8f2d7bcc0639ac4b2e246845e449e9df47793c112a5493886ca6d9ba86b906f5b5516a7bc3c43bfbfc3017197d0abcb771479b99bc435bf1c0fc619324bf3'),
('hacoaj', 'Inés', 'hacoaj.socio09@demo.example.com', 12025550168, 900609, 'scrypt$32768$8$1$7869be781d94806074a5f9e16b6254c5$50c5ed530c469a4547f8cbfbd8924df421840bfbcde37f529ea3d3c33e64678c81b21bce50721c99eb9a59900ef33eeb9a737404be18a5d590cd459e23e356b8'),
('hacoaj', 'Julián', 'hacoaj.socio10@demo.example.com', 12025550169, 900610, 'scrypt$32768$8$1$2419f92229ac2d4ee7d34834d3f473a2$e23742dbafb01661a41ae1420fbe87d479e685fd7da4abff60e722209c81f7f541e3cc3a838ba6cd34bd927e2fd1949613f99c24e6aede1f08ce4583fa61846a');
DO $$
DECLARE c record; u record; club_id bigint; usuario_id bigint; coincidencias integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Comunidad' AND column_name='logoUrl')
    OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Usuario' AND column_name='mailNormalizado') THEN
    RAISE EXCEPTION 'Primero ejecutar registro_migration.sql y clubes_logos_migration.sql';
  END IF;
  FOR c IN SELECT * FROM demo_clubes ORDER BY slug LOOP
    SELECT count(*),min(id) INTO coincidencias,club_id FROM public."Comunidad" WHERE lower(btrim(nombre))=ANY(c.aliases);
    IF coincidencias>1 THEN RAISE EXCEPTION 'Hay varias comunidades que coinciden con %. Revisar antes de cargar la demo.',c.nombre; END IF;
    IF club_id IS NULL THEN
      INSERT INTO public."Comunidad" (nombre,tipo,"logoUrl") VALUES(c.nombre,'otro',c.logo) RETURNING id INTO club_id;
    ELSE
      UPDATE public."Comunidad" SET "logoUrl"=c.logo WHERE id=club_id AND ("logoUrl" IS NULL OR btrim("logoUrl")='');
    END IF;
    FOR u IN SELECT * FROM demo_socios WHERE slug=c.slug ORDER BY socio LOOP
      SELECT id INTO usuario_id FROM public."Usuario" WHERE "mailNormalizado"=u.mail;
      IF usuario_id IS NULL THEN
        INSERT INTO public."Usuario" (nombre,apellido,mail,"contraseña",telefono)
          VALUES(u.nombre,'Demo',u.mail,u.hash,u.telefono) RETURNING id INTO usuario_id;
      ELSIF NOT EXISTS (SELECT 1 FROM public."Usuario" WHERE id=usuario_id AND nombre=u.nombre AND apellido='Demo' AND telefono=u.telefono) THEN
        RAISE EXCEPTION 'Un email reservado para la demo ya pertenece a otra cuenta. No se modificó esa cuenta.';
      END IF;
      IF EXISTS (SELECT 1 FROM public."ComunidadUsuario" WHERE "idUsuario"=usuario_id AND "idComunidad"<>club_id) THEN
        RAISE EXCEPTION 'Una cuenta de demo ya está vinculada a otra comunidad. No se trasladó.';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM public."ComunidadUsuario" WHERE "idUsuario"=usuario_id AND "idComunidad"=club_id) THEN
        INSERT INTO public."ComunidadUsuario" ("idComunidad","idUsuario",aceptado,rechazado,"nroSocio")
          VALUES(club_id,usuario_id,true,false,u.socio);
      END IF;
    END LOOP;
  END LOOP;
END $$;
SELECT c.nombre AS club,c."logoUrl",count(m.id) AS usuarios_demo
FROM public."Comunidad" c
JOIN public."ComunidadUsuario" m ON m."idComunidad"=c.id
JOIN public."Usuario" u ON u.id=m."idUsuario"
JOIN demo_socios d ON d.mail=u."mailNormalizado"
GROUP BY c.id,c.nombre,c."logoUrl" ORDER BY c.nombre;
COMMIT;
