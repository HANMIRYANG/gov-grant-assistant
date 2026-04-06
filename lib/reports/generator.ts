import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  TableLayoutType,
} from "docx";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  BUDGET_CATEGORY_LABELS,
  MILESTONE_TYPE_LABELS,
  OUTPUT_TYPE_LABELS,
  OUTPUT_STATUS_LABELS,
  PERSONNEL_ROLE_LABELS,
  type BudgetCategory,
  type MilestoneType,
  type OutputType,
  type OutputStatus,
} from "@/lib/utils/types";

export type ReportType = "mid" | "final" | "settlement";

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  mid: "중간보고서",
  final: "최종보고서",
  settlement: "정산보고서",
};

interface ProjectData {
  project: {
    project_name: string;
    project_code: string | null;
    funding_agency: string;
    managing_org: string | null;
    start_date: string;
    end_date: string;
    total_budget: number;
    govt_fund: number;
    private_fund: number;
    description: string | null;
    status: string;
    pi?: { name: string; department: string | null; position: string | null } | null;
  };
  budgetItems: {
    category: string;
    fund_source: string;
    planned_amount: number;
    spent_amount: number;
  }[];
  expenses: {
    expense_date: string;
    amount: number;
    vendor: string;
    description: string;
    category: string;
  }[];
  milestones: {
    title: string;
    milestone_type: string;
    due_date: string;
    completed_date: string | null;
    progress_pct: number;
    kpi_target: Record<string, string>;
    kpi_actual: Record<string, string>;
  }[];
  personnel: {
    name: string;
    role: string;
    participation_rate: number;
    monthly_cost: number;
  }[];
  outputs: {
    output_type: string;
    title: string;
    status: string;
    achieved_date: string | null;
  }[];
}

function formatKRW(amount: number): string {
  return amount.toLocaleString("ko-KR") + "원";
}

function formatDate(dateStr: string): string {
  return format(new Date(dateStr), "yyyy.MM.dd", { locale: ko });
}

const cellBorders = {
  top: { style: BorderStyle.SINGLE, size: 1, color: "999999" },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: "999999" },
  left: { style: BorderStyle.SINGLE, size: 1, color: "999999" },
  right: { style: BorderStyle.SINGLE, size: 1, color: "999999" },
} as const;

function headerCell(text: string, width?: number): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, size: 20, font: "맑은 고딕" })],
        alignment: AlignmentType.CENTER,
      }),
    ],
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    shading: { fill: "E8F0FE" },
    borders: cellBorders,
  });
}

function dataCell(text: string, align?: (typeof AlignmentType)[keyof typeof AlignmentType]): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, size: 20, font: "맑은 고딕" })],
        alignment: align ?? AlignmentType.LEFT,
      }),
    ],
    borders: cellBorders,
  });
}

export async function generateReport(
  reportType: ReportType,
  data: ProjectData,
): Promise<Buffer> {
  const { project, budgetItems, expenses, milestones, personnel, outputs } = data;
  const reportTitle = REPORT_TYPE_LABELS[reportType];
  const today = format(new Date(), "yyyy년 M월 d일", { locale: ko });

  const sections: Paragraph[] = [];

  // 표지
  sections.push(
    new Paragraph({ spacing: { after: 600 } }),
    new Paragraph({
      children: [
        new TextRun({
          text: reportTitle,
          bold: true,
          size: 48,
          font: "맑은 고딕",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: project.project_name,
          bold: true,
          size: 32,
          font: "맑은 고딕",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: project.project_code ? `과제번호: ${project.project_code}` : "",
          size: 24,
          font: "맑은 고딕",
          color: "666666",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: today, size: 24, font: "맑은 고딕" }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "한미르 주식회사",
          size: 24,
          font: "맑은 고딕",
          bold: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    }),
  );

  // 1. 과제 개요
  sections.push(
    new Paragraph({
      text: "1. 과제 개요",
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    }),
  );

  const infoTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        children: [
          headerCell("항목", 25),
          dataCell(project.project_name),
        ],
      }),
      new TableRow({
        children: [
          headerCell("주관기관", 25),
          dataCell(project.funding_agency),
        ],
      }),
      ...(project.managing_org
        ? [
            new TableRow({
              children: [
                headerCell("전문기관", 25),
                dataCell(project.managing_org),
              ],
            }),
          ]
        : []),
      new TableRow({
        children: [
          headerCell("연구기간", 25),
          dataCell(`${formatDate(project.start_date)} ~ ${formatDate(project.end_date)}`),
        ],
      }),
      new TableRow({
        children: [
          headerCell("총 연구비", 25),
          dataCell(
            `${formatKRW(project.total_budget)} (정부 ${formatKRW(project.govt_fund)} / 민간 ${formatKRW(project.private_fund)})`,
          ),
        ],
      }),
      ...(project.pi
        ? [
            new TableRow({
              children: [
                headerCell("과제책임자", 25),
                dataCell(
                  `${project.pi.name}${project.pi.position ? ` (${project.pi.position})` : ""}`,
                ),
              ],
            }),
          ]
        : []),
    ],
  });
  sections.push(new Paragraph({ children: [] }));

  // 2. 연구 내용 (마일스톤 기반)
  sections.push(
    new Paragraph({
      text: "2. 연구 수행 내용",
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    }),
  );

  if (milestones.length > 0) {
    const msRows = milestones.map(
      (m) =>
        new TableRow({
          children: [
            dataCell(MILESTONE_TYPE_LABELS[m.milestone_type as MilestoneType] ?? m.milestone_type),
            dataCell(m.title),
            dataCell(formatDate(m.due_date), AlignmentType.CENTER),
            dataCell(
              m.completed_date ? formatDate(m.completed_date) : "-",
              AlignmentType.CENTER,
            ),
            dataCell(`${m.progress_pct}%`, AlignmentType.CENTER),
          ],
        }),
    );

    const msTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      rows: [
        new TableRow({
          children: [
            headerCell("유형", 15),
            headerCell("마일스톤", 35),
            headerCell("목표일", 15),
            headerCell("완료일", 15),
            headerCell("진행률", 10),
          ],
        }),
        ...msRows,
      ],
    });
    sections.push(new Paragraph({ children: [] }));

    // KPI 달성 현황
    const kpiMilestones = milestones.filter(
      (m) => Object.keys(m.kpi_target).length > 0,
    );
    if (kpiMilestones.length > 0) {
      sections.push(
        new Paragraph({
          text: "2.1 성능 목표(KPI) 달성 현황",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 200 },
        }),
      );

      const kpiRows: TableRow[] = [];
      for (const m of kpiMilestones) {
        for (const [key, target] of Object.entries(m.kpi_target)) {
          const actual = m.kpi_actual[key] ?? "-";
          kpiRows.push(
            new TableRow({
              children: [
                dataCell(m.title),
                dataCell(key),
                dataCell(target, AlignmentType.CENTER),
                dataCell(actual, AlignmentType.CENTER),
              ],
            }),
          );
        }
      }

      const kpiTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        layout: TableLayoutType.FIXED,
        rows: [
          new TableRow({
            children: [
              headerCell("마일스톤", 30),
              headerCell("지표", 25),
              headerCell("목표", 20),
              headerCell("실적", 20),
            ],
          }),
          ...kpiRows,
        ],
      });
      sections.push(new Paragraph({ children: [] }));
    }
  } else {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({ text: "등록된 마일스톤이 없습니다.", size: 20, font: "맑은 고딕" }),
        ],
      }),
    );
  }

  // 3. 참여 인력
  sections.push(
    new Paragraph({
      text: "3. 참여 인력 현황",
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    }),
  );

  if (personnel.length > 0) {
    const pRows = personnel.map(
      (p) =>
        new TableRow({
          children: [
            dataCell(p.name),
            dataCell(PERSONNEL_ROLE_LABELS[p.role] ?? p.role),
            dataCell(`${p.participation_rate}%`, AlignmentType.CENTER),
            dataCell(formatKRW(p.monthly_cost), AlignmentType.RIGHT),
          ],
        }),
    );

    const pTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      rows: [
        new TableRow({
          children: [
            headerCell("성명", 30),
            headerCell("역할", 25),
            headerCell("참여율", 20),
            headerCell("월 인건비", 25),
          ],
        }),
        ...pRows,
      ],
    });
    sections.push(new Paragraph({ children: [] }));
  }

  // 4. 예산 집행 현황
  if (reportType === "settlement" || reportType === "final") {
    sections.push(
      new Paragraph({
        text: "4. 연구비 집행 현황",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
    );

    if (budgetItems.length > 0) {
      const bRows = budgetItems.map(
        (b) =>
          new TableRow({
            children: [
              dataCell(BUDGET_CATEGORY_LABELS[b.category as BudgetCategory] ?? b.category),
              dataCell(formatKRW(b.planned_amount), AlignmentType.RIGHT),
              dataCell(formatKRW(b.spent_amount), AlignmentType.RIGHT),
              dataCell(
                `${b.planned_amount > 0 ? Math.round((b.spent_amount / b.planned_amount) * 100) : 0}%`,
                AlignmentType.CENTER,
              ),
            ],
          }),
      );

      const totalPlanned = budgetItems.reduce((s, b) => s + b.planned_amount, 0);
      const totalSpent = budgetItems.reduce((s, b) => s + b.spent_amount, 0);

      bRows.push(
        new TableRow({
          children: [
            headerCell("합계"),
            dataCell(formatKRW(totalPlanned), AlignmentType.RIGHT),
            dataCell(formatKRW(totalSpent), AlignmentType.RIGHT),
            dataCell(
              `${totalPlanned > 0 ? Math.round((totalSpent / totalPlanned) * 100) : 0}%`,
              AlignmentType.CENTER,
            ),
          ],
        }),
      );

      const bTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        layout: TableLayoutType.FIXED,
        rows: [
          new TableRow({
            children: [
              headerCell("비목", 30),
              headerCell("편성액", 25),
              headerCell("집행액", 25),
              headerCell("집행률", 20),
            ],
          }),
          ...bRows,
        ],
      });
      sections.push(new Paragraph({ children: [] }));
    }

    // 정산보고서: 집행 상세 내역
    if (reportType === "settlement" && expenses.length > 0) {
      sections.push(
        new Paragraph({
          text: "4.1 집행 상세 내역",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 200 },
        }),
      );

      const eRows = expenses.map(
        (e) =>
          new TableRow({
            children: [
              dataCell(formatDate(e.expense_date), AlignmentType.CENTER),
              dataCell(BUDGET_CATEGORY_LABELS[e.category as BudgetCategory] ?? e.category),
              dataCell(e.description),
              dataCell(e.vendor),
              dataCell(formatKRW(e.amount), AlignmentType.RIGHT),
            ],
          }),
      );

      const eTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        layout: TableLayoutType.FIXED,
        rows: [
          new TableRow({
            children: [
              headerCell("일자", 12),
              headerCell("비목", 15),
              headerCell("내용", 30),
              headerCell("거래처", 20),
              headerCell("금액", 18),
            ],
          }),
          ...eRows,
        ],
      });
      sections.push(new Paragraph({ children: [] }));
    }
  }

  // 5. 연구 성과물
  const outputSection = reportType === "settlement" ? "5" : "4";
  sections.push(
    new Paragraph({
      text: `${outputSection}. 연구 성과`,
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    }),
  );

  if (outputs.length > 0) {
    const oRows = outputs.map(
      (o) =>
        new TableRow({
          children: [
            dataCell(OUTPUT_TYPE_LABELS[o.output_type as OutputType] ?? o.output_type),
            dataCell(o.title),
            dataCell(OUTPUT_STATUS_LABELS[o.status as OutputStatus] ?? o.status, AlignmentType.CENTER),
            dataCell(
              o.achieved_date ? formatDate(o.achieved_date) : "-",
              AlignmentType.CENTER,
            ),
          ],
        }),
    );

    const oTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      rows: [
        new TableRow({
          children: [
            headerCell("유형", 15),
            headerCell("성과물", 40),
            headerCell("상태", 15),
            headerCell("달성일", 15),
          ],
        }),
        ...oRows,
      ],
    });
    sections.push(new Paragraph({ children: [] }));
  } else {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({ text: "등록된 성과물이 없습니다.", size: 20, font: "맑은 고딕" }),
        ],
      }),
    );
  }

  // docx 문서 생성
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
        },
        children: [
          ...sections,
          // 테이블들을 children에 삽입해야 하지만, docx 라이브러리에서는
          // Section children에 Paragraph과 Table을 모두 넣을 수 있음
          infoTable,
          ...(milestones.length > 0
            ? buildMilestoneTable(milestones)
            : []),
          ...(personnel.length > 0 ? buildPersonnelTable(personnel) : []),
          ...((reportType === "settlement" || reportType === "final") && budgetItems.length > 0
            ? buildBudgetTable(budgetItems)
            : []),
          ...(reportType === "settlement" && expenses.length > 0
            ? buildExpenseTable(expenses)
            : []),
          ...(outputs.length > 0 ? buildOutputTable(outputs) : []),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer as Buffer;
}

function buildMilestoneTable(milestones: ProjectData["milestones"]): (Table | Paragraph)[] {
  const rows = milestones.map(
    (m) =>
      new TableRow({
        children: [
          dataCell(MILESTONE_TYPE_LABELS[m.milestone_type as MilestoneType] ?? m.milestone_type),
          dataCell(m.title),
          dataCell(formatDate(m.due_date), AlignmentType.CENTER),
          dataCell(m.completed_date ? formatDate(m.completed_date) : "-", AlignmentType.CENTER),
          dataCell(`${m.progress_pct}%`, AlignmentType.CENTER),
        ],
      }),
  );

  return [
    new Paragraph({ spacing: { before: 200 } }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      rows: [
        new TableRow({
          children: [
            headerCell("유형", 15),
            headerCell("마일스톤", 35),
            headerCell("목표일", 15),
            headerCell("완료일", 15),
            headerCell("진행률", 10),
          ],
        }),
        ...rows,
      ],
    }),
  ];
}

function buildPersonnelTable(personnel: ProjectData["personnel"]): (Table | Paragraph)[] {
  const rows = personnel.map(
    (p) =>
      new TableRow({
        children: [
          dataCell(p.name),
          dataCell(PERSONNEL_ROLE_LABELS[p.role] ?? p.role),
          dataCell(`${p.participation_rate}%`, AlignmentType.CENTER),
          dataCell(formatKRW(p.monthly_cost), AlignmentType.RIGHT),
        ],
      }),
  );

  return [
    new Paragraph({ spacing: { before: 200 } }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      rows: [
        new TableRow({
          children: [
            headerCell("성명", 30),
            headerCell("역할", 25),
            headerCell("참여율", 20),
            headerCell("월 인건비", 25),
          ],
        }),
        ...rows,
      ],
    }),
  ];
}

function buildBudgetTable(budgetItems: ProjectData["budgetItems"]): (Table | Paragraph)[] {
  const rows = budgetItems.map(
    (b) =>
      new TableRow({
        children: [
          dataCell(BUDGET_CATEGORY_LABELS[b.category as BudgetCategory] ?? b.category),
          dataCell(formatKRW(b.planned_amount), AlignmentType.RIGHT),
          dataCell(formatKRW(b.spent_amount), AlignmentType.RIGHT),
          dataCell(
            `${b.planned_amount > 0 ? Math.round((b.spent_amount / b.planned_amount) * 100) : 0}%`,
            AlignmentType.CENTER,
          ),
        ],
      }),
  );

  const totalPlanned = budgetItems.reduce((s, b) => s + b.planned_amount, 0);
  const totalSpent = budgetItems.reduce((s, b) => s + b.spent_amount, 0);

  return [
    new Paragraph({ spacing: { before: 200 } }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      rows: [
        new TableRow({
          children: [
            headerCell("비목", 30),
            headerCell("편성액", 25),
            headerCell("집행액", 25),
            headerCell("집행률", 20),
          ],
        }),
        ...rows,
        new TableRow({
          children: [
            headerCell("합계"),
            dataCell(formatKRW(totalPlanned), AlignmentType.RIGHT),
            dataCell(formatKRW(totalSpent), AlignmentType.RIGHT),
            dataCell(
              `${totalPlanned > 0 ? Math.round((totalSpent / totalPlanned) * 100) : 0}%`,
              AlignmentType.CENTER,
            ),
          ],
        }),
      ],
    }),
  ];
}

function buildExpenseTable(expenses: ProjectData["expenses"]): (Table | Paragraph)[] {
  const rows = expenses.map(
    (e) =>
      new TableRow({
        children: [
          dataCell(formatDate(e.expense_date), AlignmentType.CENTER),
          dataCell(BUDGET_CATEGORY_LABELS[e.category as BudgetCategory] ?? e.category),
          dataCell(e.description),
          dataCell(e.vendor),
          dataCell(formatKRW(e.amount), AlignmentType.RIGHT),
        ],
      }),
  );

  return [
    new Paragraph({ spacing: { before: 200 } }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      rows: [
        new TableRow({
          children: [
            headerCell("일자", 12),
            headerCell("비목", 15),
            headerCell("내용", 30),
            headerCell("거래처", 20),
            headerCell("금액", 18),
          ],
        }),
        ...rows,
      ],
    }),
  ];
}

function buildOutputTable(outputs: ProjectData["outputs"]): (Table | Paragraph)[] {
  const rows = outputs.map(
    (o) =>
      new TableRow({
        children: [
          dataCell(OUTPUT_TYPE_LABELS[o.output_type as OutputType] ?? o.output_type),
          dataCell(o.title),
          dataCell(OUTPUT_STATUS_LABELS[o.status as OutputStatus] ?? o.status, AlignmentType.CENTER),
          dataCell(o.achieved_date ? formatDate(o.achieved_date) : "-", AlignmentType.CENTER),
        ],
      }),
  );

  return [
    new Paragraph({ spacing: { before: 200 } }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      rows: [
        new TableRow({
          children: [
            headerCell("유형", 15),
            headerCell("성과물", 40),
            headerCell("상태", 15),
            headerCell("달성일", 15),
          ],
        }),
        ...rows,
      ],
    }),
  ];
}
